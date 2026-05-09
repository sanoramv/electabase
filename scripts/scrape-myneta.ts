/**
 * Scrapes myneta.info for each politician's affidavit data:
 *  - profession, net worth, criminal cases
 * Inserts/updates DB records. Skips ambiguous matches.
 */
import { PrismaClient, CaseStatus } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://myneta.info";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";

async function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string> {
  await delay(3000);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Search result parsing ────────────────────────────────────────────────────

interface SearchResult {
  href: string;
  name: string;
  party: string;
  constituency: string;
  election: string;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Robust parser: finds all candidate links, then extracts the enclosing <td> cells
 * via sibling <td> patterns.
 */
function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  // All candidate hrefs
  const hrefRe = /href=(\/[a-zA-Z0-9_\-\/]+\/candidate\.php\?candidate_id=\d+)/g;
  for (const m of html.matchAll(hrefRe)) {
    const href = m[1];
    const pos = m.index!;
    // Extract the anchor text (name)
    const anchorEnd = html.indexOf("</a>", pos);
    const anchorHtml = html.substring(pos + href.length + 6, anchorEnd);
    const name = stripTags(anchorHtml);
    if (!name || name.length < 2) continue;

    // Walk forward to find the outer </td></tr></table></td> then next siblings
    const outerClose = html.indexOf("</table>", anchorEnd);
    if (outerClose < 0) continue;
    const afterOuter = html.indexOf("</td>", outerClose);
    if (afterOuter < 0) continue;

    // Next 3 <td>…</td> blocks = party, constituency, election
    const cells: string[] = [];
    let searchFrom = afterOuter + 5;
    for (let i = 0; i < 4 && cells.length < 3; i++) {
      const tdStart = html.indexOf("<td", searchFrom);
      if (tdStart < 0) break;
      const tdEnd = html.indexOf("</td>", tdStart);
      if (tdEnd < 0) break;
      const cellHtml = html.substring(tdStart, tdEnd);
      const cellText = stripTags(cellHtml);
      // Skip if this is the candidate column (contains another <table>)
      if (!cellHtml.includes("<table")) {
        cells.push(cellText);
      }
      searchFrom = tdEnd + 5;
    }

    if (cells.length < 3) continue;
    results.push({
      href,
      name,
      party: cells[0],
      constituency: cells[1],
      election: cells[2],
    });
  }
  return results;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function constitencyMatch(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Handle common transliteration variants (Thoothukudi / Thoothukkudi / Tuticorin)
  const variants: string[][] = [
    ["thoothukudi", "thoothukkudi", "tuticorin"],
    ["chidambaram", "chidmbaram"],
    ["coimbatore", "kovai"],
    ["tiruchirappalli", "trichy", "tiruchirapalli"],
    ["villupuram", "viluppuram"],
    ["cuddalore", "kuddalur"],
    ["kallakurichi", "kallakkurichi"],
    ["vellore", "velur"],
    ["arakkonam", "arakkkonam"],
    ["tiruvallur", "thiruvallur"],
    ["sriperumbudur", "sriperumpudur"],
    ["nilgiris", "nilagiri"],
  ];
  for (const group of variants) {
    if (group.some(v => na.includes(v)) && group.some(v => nb.includes(v))) return true;
  }
  return false;
}

function matchResult(
  results: SearchResult[],
  fullName: string,
  electionType: string,
  electionYear: number | null,
  constituency: string | null,
): SearchResult | null | "MULTIPLE" {
  const typeKey = electionType === "LOK_SABHA" ? "lok sabha" : "rajya sabha";

  // 1. Filter by election type
  let pool = results.filter((r) => r.election.toLowerCase().includes(typeKey));
  if (pool.length === 0) return null;

  // 2. Filter by year (prefer exact, fall back to any)
  if (electionYear) {
    const exact = pool.filter((r) => r.election.includes(String(electionYear)));
    if (exact.length > 0) pool = exact;
    else {
      // Pick most recent year from pool
      const yearRe = /(\d{4})/;
      pool.sort((a, b) => {
        const ya = parseInt(a.election.match(yearRe)?.[1] ?? "0", 10);
        const yb = parseInt(b.election.match(yearRe)?.[1] ?? "0", 10);
        return yb - ya;
      });
      pool = pool.slice(0, pool.filter(r => r.election.includes(String(pool[0].election.match(yearRe)?.[1]))).length || 1);
    }
  }

  // 3. Filter by constituency
  if (constituency && pool.length > 1) {
    const constMatch = pool.filter((r) => constitencyMatch(r.constituency, constituency));
    if (constMatch.length > 0) pool = constMatch;
  }

  // 4. Filter by name match (all nameParts must match, not just any)
  if (pool.length > 1) {
    const nameParts = norm(fullName).replace(/^(dr|shri|smt|mr|mrs|thiru)/, "").split(/\s+/).filter((p) => p.length > 2);
    // Score each result by how many name parts match
    const scored = pool.map((r) => {
      const rn = norm(r.name);
      const hits = nameParts.filter((p) => rn.includes(p)).length;
      return { r, hits };
    }).sort((a, b) => b.hits - a.hits);
    const topScore = scored[0].hits;
    const topMatches = scored.filter((s) => s.hits === topScore).map((s) => s.r);
    pool = topMatches;
  }

  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  return "MULTIPLE";
}

// ─── Affidavit parsing ────────────────────────────────────────────────────────

interface AffidavitCase {
  chargeDescription: string;
  ipcSection: string | null;
  court: string | null;
  status: CaseStatus;
}

interface AffidavitData {
  profession: string | null;
  assets: number | null;
  liabilities: number | null;
  netWorth: number | null;
  cases: AffidavitCase[];
}

function parseRupees(segment: string): number | null {
  const m = segment.match(/Rs[\s&nbsp;,]*([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

function inferCaseStatus(details: string): CaseStatus {
  const d = details.toLowerCase();
  if (d.includes("convicted")) return CaseStatus.CONVICTED;
  if (d.includes("acquitted") && d.includes("appeal")) return CaseStatus.APPEALING;
  if (d.includes("acquitted")) return CaseStatus.ACQUITTED;
  if (d.includes("appeal") || d.includes("high court") || d.includes("supreme court")) return CaseStatus.APPEALING;
  return CaseStatus.PENDING;
}

function parseAffidavit(html: string): AffidavitData {
  // Profession
  const profM = html.match(/<b>Self Profession:<\/b>([^<\n]{2,80})/);
  const profession = profM ? profM[1].replace(/\s+/g, " ").trim() : null;

  // Assets / Liabilities
  const assetM = html.match(/Assets:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)/);
  const liabM = html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)/);
  const assets = assetM ? parseInt(assetM[1].replace(/,/g, ""), 10) : null;
  const liabilities = liabM ? parseInt(liabM[1].replace(/,/g, ""), 10) : null;
  const netWorth = assets !== null && liabilities !== null ? assets - liabilities : assets;

  // Criminal cases table
  const cases: AffidavitCase[] = [];
  const tableM = html.match(/id=cases[^>]*>([\s\S]*?)<\/table>/);
  if (tableM) {
    // Split rows by <tr><td> (skip header)
    const rows = tableM[1].split(/<tr>/);
    for (const row of rows.slice(1)) {
      if (!row.includes("</td>")) continue;
      const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) =>
        stripTags(c[1]).replace(/\s+/g, " ").trim()
      );
      if (cells.length < 5) continue;
      const ipcSection = cells[3] || null;
      const otherActs = cells[4] || "";
      const statusDetails = cells.slice(8).join(" ").trim() || cells.slice(6).join(" ").trim();
      const chargeDesc = (ipcSection || otherActs || "Criminal case (see affidavit)").substring(0, 400);
      cases.push({
        chargeDescription: chargeDesc,
        ipcSection: ipcSection ? ipcSection.substring(0, 100) : null,
        court: cells[2] ? cells[2].substring(0, 200) : null,
        status: inferCaseStatus(statusDetails),
      });
    }
  }

  return { profession, assets, liabilities, netWorth, cases };
}

// ─── DB operations ────────────────────────────────────────────────────────────

async function applyAffidavit(
  politicianId: string,
  data: AffidavitData,
  sourceUrl: string
) {
  const updateData: Record<string, unknown> = {};
  if (data.profession) {
    updateData.professionBeforePolitics = data.profession;
    updateData.currentProfession = data.profession;
  }
  if (data.netWorth !== null) {
    updateData.netWorthDeclared = data.netWorth;
    updateData.netWorthSourceUrl = sourceUrl;
  }
  if (Object.keys(updateData).length > 0) {
    await prisma.politician.update({ where: { id: politicianId }, data: updateData });
  }

  // Delete old "Data Not Available" corruption records from myneta before inserting crime records
  // (crime records live in CrimeRecord not CorruptionRecord, so no action needed there)

  // Insert new crime records (deduplicate by chargeDescription)
  const existing = await prisma.crimeRecord.findMany({
    where: { politicianId, sourceUrl },
    select: { chargeDescription: true },
  });
  const existSet = new Set(existing.map((e) => e.chargeDescription));
  let inserted = 0;
  for (const c of data.cases) {
    if (existSet.has(c.chargeDescription)) continue;
    await prisma.crimeRecord.create({
      data: {
        politicianId,
        chargeDescription: c.chargeDescription,
        ipcSection: c.ipcSection,
        courtName: c.court,
        caseStatus: c.status,
        sourceUrl,
        isVerified: true,
      },
    });
    inserted++;
  }
  return inserted;
}

// ─── Per-politician logic ─────────────────────────────────────────────────────

interface PoliticianRow {
  id: string;
  fullName: string;
  electionType: string;
  electionYear: number | null;
  constituency: string | null;
  searchNames: string[];
}

function buildSearchNames(fullName: string, _electionType: string): string[] {
  const names: string[] = [fullName];
  const stripped = fullName.replace(/^(Thiru\.?\s+|Thol\.\s+)/i, "").trim();
  if (stripped !== fullName) names.push(stripped);
  const withoutInitial = fullName.replace(/^[A-Z]\.\s+/, "").trim();
  if (withoutInitial !== fullName) names.push(withoutInitial);
  const ALT: Record<string, string[]> = {
    "Andimuthu Raja": ["A. Raja"],
    "Thiru Rajinikanth Baalu": ["T. R. Baalu"],
    "Thol. Thirumavalavan": ["Thirumavalavan"],
    "Vai Gopalaswamy": ["Vaiko"],
    "Jagat Prakash Nadda": ["J. P. Nadda"],
    "Piyush Vedprakash Goyal": ["Piyush Goyal"],
    "Dharmalingam Ravikumar": ["D. Ravikumar"],
    "Manickam Tagore": ["Manickam Tagore B"],
    "Savarimuthu Jagathrakshakan": ["S. Jagathrakshakan"],
    "Ramalingam Girirajan": ["R. Girirajan"],
    "C. N. Annadurai Krishnan": ["Annadurai Krishnan"],
    "Priyanka Gandhi Vadra": ["Priyanka Gandhi"],
    "A. Annamalai": ["K. Annamalai"],
    "P. R. Natarajan": ["P.R. Natarajan"],
    "R. S. Bharathi": ["R.S. Bharathi"],
    "S. R. Vijayakumar": ["S.R. Vijayakumar"],
    "T. K. S. Elangovan": ["T.K.S. Elangovan"],
  };
  if (ALT[fullName]) names.push(...ALT[fullName]);
  return [...new Set(names)];
}

const UPDATED: string[] = [];
const NOT_FOUND: string[] = [];
const FLAGGED: string[] = [];
const ERRORS: string[] = [];

async function processPolitician(p: PoliticianRow) {
  for (const searchName of p.searchNames) {
    let searchHtml: string;
    try {
      searchHtml = await fetchHtml(`${BASE}/search_myneta.php?q=${encodeURIComponent(searchName)}`);
    } catch {
      continue; // try next search name
    }

    const results = parseSearchResults(searchHtml);
    if (results.length === 0) continue;

    const match = matchResult(results, p.fullName, p.electionType, p.electionYear, p.constituency);

    if (match === null) continue; // try next name
    if (match === "MULTIPLE") {
      // flag with details for manual review
      const relevant = results.filter((r) =>
        r.election.toLowerCase().includes(p.electionType === "LOK_SABHA" ? "lok sabha" : "rajya sabha")
      );
      FLAGGED.push(`${p.fullName} | query="${searchName}" | matches: ${relevant.slice(0,4).map((r) => `${r.name} (${r.election}, ${r.constituency})`).join(" · ")}`);
      return;
    }

    // Fetch affidavit
    const affUrl = `${BASE}${match.href}`;
    let affHtml: string;
    try {
      affHtml = await fetchHtml(affUrl);
    } catch (e: unknown) {
      ERRORS.push(`${p.fullName}: affidavit fetch failed — ${(e as Error).message}`);
      return;
    }

    const data = parseAffidavit(affHtml);
    const inserted = await applyAffidavit(p.id, data, affUrl);

    const summary = [
      `match="${match.name}" (${match.election}, ${match.constituency})`,
      `profession=${data.profession ?? "—"}`,
      `netWorth=${data.netWorth != null ? "₹" + Math.round(data.netWorth / 100000) + "L" : "—"}`,
      `cases=${data.cases.length} inserted=${inserted}`,
    ].join(", ");
    console.log(`✓ ${p.fullName} — ${summary}`);
    console.log(`  ${affUrl}`);
    UPDATED.push(`${p.fullName}: ${summary}`);
    return;
  }

  NOT_FOUND.push(p.fullName);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Only retry these 14 politicians (11 not-yet-found + 3 previously reset as wrong matches)
const TARGET_IDS = new Set([
  "cmox21kgl002r3iqn7ifcruid", // A. Annamalai
  "cmox21nr400353iqnnsdxwqup", // Anbumani Ramadoss
  "cmox02jiy001v5qj22cjsgh2k", // Andimuthu Raja
  "cmox05fxi00ap5qj249jdwadv", // Kothandaraman Shanmugam
  "cmox213wc000t3iqn2pkaauku", // Manickam Tagore
  "cmox21ufi003x3iqnzzus6n8f", // P. R. Natarajan
  "cmox21h65002d3iqn5le850ks", // R. S. Bharathi
  "cmox20x7h00013iqnrd5dy5ky", // S. R. Vijayakumar
  "cmox21ahr001l3iqnixxz657q", // S. Venkatesan
  "cmox22rs0007t3iqnny9c22n9", // T. K. S. Elangovan
  "cmox21r4r003j3iqnoj3jlf9u", // Thol. Thirumavalavan
  "cmox21dvf001z3iqn0s118e5f", // K. Shanmugam (reset: wrong constituency)
  "cmox210il000f3iqnlos7d27t", // M. Selvarasu (reset: wrong match)
  "cmox06dr700dz5qj2de6kh9v9", // Vai Gopalaswamy (reset: wrong match)
]);

async function main() {
  const dbRows = await prisma.politician.findMany({
    select: {
      id: true, fullName: true,
      electionContests: {
        orderBy: { electionYear: "desc" }, take: 1,
        select: { electionYear: true, electionType: true, constituency: true },
      },
      parliamentaryTenures: {
        orderBy: { termStartDate: "desc" }, take: 1,
        select: { house: true, termStartDate: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const politicians: PoliticianRow[] = dbRows
    .filter((r) => TARGET_IDS.has(r.id))
    .map((r) => {
      let electionType = "LOK_SABHA";
      let electionYear: number | null = null;
      let constituency: string | null = null;
      if (r.electionContests.length > 0) {
        electionType = r.electionContests[0].electionType;
        electionYear = r.electionContests[0].electionYear;
        constituency = r.electionContests[0].constituency;
      } else if (r.parliamentaryTenures.length > 0) {
        electionType = r.parliamentaryTenures[0].house;
        electionYear = new Date(r.parliamentaryTenures[0].termStartDate).getFullYear();
      }
      return {
        id: r.id,
        fullName: r.fullName,
        electionType,
        electionYear,
        constituency,
        searchNames: buildSearchNames(r.fullName, electionType),
      };
    });

  console.log(`Processing ${politicians.length} targeted politicians...\n`);
  for (const p of politicians) {
    try {
      await processPolitician(p);
    } catch (e: unknown) {
      ERRORS.push(`${p.fullName}: ${(e as Error).message}`);
      console.error(`✗ ${p.fullName}: ${(e as Error).message}`);
    }
  }

  console.log("\n" + "═".repeat(64));
  console.log(`\nUPDATED (${UPDATED.length}):`);
  UPDATED.forEach((s) => console.log("  ✓ " + s));
  console.log(`\nFLAGGED FOR MANUAL REVIEW (${FLAGGED.length}):`);
  FLAGGED.forEach((s) => console.log("  ⚠ " + s));
  console.log(`\nNOT FOUND (${NOT_FOUND.length}):`);
  NOT_FOUND.forEach((s) => console.log("  – " + s));
  console.log(`\nERRORS (${ERRORS.length}):`);
  ERRORS.forEach((s) => console.log("  ✗ " + s));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
