import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { SourceBadge } from "@/components/politician/source-badge";
import { CorrectionLink } from "@/components/politician/correction-link";
import { ScoreCard } from "@/components/politician/score-card";
import type { Metadata } from "next";

export const revalidate = 3600; // ISR: revalidate every hour

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const politician = await db.politician.findFirst({
    where: { slug, isPublished: true },
    select: { fullName: true, currentParty: { select: { name: true } } },
  });
  if (!politician) return { title: "Not Found" };
  return {
    title: `${politician.fullName} — ElectaBase`,
    description: `Political transparency profile for ${politician.fullName}${politician.currentParty ? ` (${politician.currentParty.name})` : ""}. Scores, records, and source links.`,
    openGraph: {
      title: `${politician.fullName} | ElectaBase`,
      type: "profile",
    },
  };
}

export default async function PoliticianProfilePage({ params }: Props) {
  const { slug } = await params;

  const politician = await db.politician.findFirst({
    where: { slug, isPublished: true },
    include: {
      currentParty: true,
      electionContests: { orderBy: { electionYear: "desc" } },
      parliamentaryTenures: { orderBy: { termStartDate: "desc" }, include: { party: true } },
      partyAffiliations: { orderBy: { startDate: "desc" }, include: { party: true } },
      achievements: { where: { isVerified: true }, orderBy: { date: "desc" } },
      corruptionRecords: { where: { isVerified: true }, orderBy: { date: "desc" } },
      controversies: { where: { isVerified: true }, orderBy: { date: "desc" } },
      crimeRecords: { where: { isVerified: true }, orderBy: { createdAt: "desc" } },
      attendanceRecords: { orderBy: { year: "desc" } },
      effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1 },
      corruptionScores: { orderBy: { computedAt: "desc" }, take: 1 },
      relationshipsFrom: {
        where: { relatedPolitician: { isPublished: true } },
        include: {
          relatedPolitician: {
            select: {
              slug: true,
              fullName: true,
              photoUrl: true,
              currentParty: { select: { abbreviation: true } },
              effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true } },
              corruptionScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true } },
            },
          },
        },
      },
      relationshipsTo: {
        where: { politician: { isPublished: true } },
        include: {
          politician: {
            select: {
              slug: true,
              fullName: true,
              photoUrl: true,
              currentParty: { select: { abbreviation: true } },
              effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true } },
              corruptionScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true } },
            },
          },
        },
      },
    },
  });

  if (!politician) notFound();

  // Merge both relationship directions into a single display list
  const INVERSE_TYPES: Record<string, string> = {
    PARENT: "Child",
    CHILD: "Parent",
    SPOUSE: "Spouse",
    SIBLING: "Sibling",
    OTHER: "Relative",
  };
  const TYPE_LABELS: Record<string, string> = {
    PARENT: "Parent",
    CHILD: "Child",
    SPOUSE: "Spouse",
    SIBLING: "Sibling",
    OTHER: "Relative",
  };

  type FamilyMember = {
    slug: string;
    fullName: string;
    photoUrl: string | null;
    partyAbbreviation: string | null;
    effectivenessScore: number | null;
    corruptionScore: number | null;
    relationshipLabel: string;
    sourceUrl: string;
  };

  const familyMembers: FamilyMember[] = [
    ...politician.relationshipsFrom.map((r) => ({
      slug: r.relatedPolitician.slug,
      fullName: r.relatedPolitician.fullName,
      photoUrl: r.relatedPolitician.photoUrl,
      partyAbbreviation: r.relatedPolitician.currentParty?.abbreviation ?? null,
      effectivenessScore: r.relatedPolitician.effectivenessScores[0]
        ? Number(r.relatedPolitician.effectivenessScores[0].score)
        : null,
      corruptionScore: r.relatedPolitician.corruptionScores[0]
        ? Number(r.relatedPolitician.corruptionScores[0].score)
        : null,
      relationshipLabel: r.description ?? TYPE_LABELS[r.relationshipType] ?? r.relationshipType,
      sourceUrl: r.sourceUrl,
    })),
    ...politician.relationshipsTo.map((r) => ({
      slug: r.politician.slug,
      fullName: r.politician.fullName,
      photoUrl: r.politician.photoUrl,
      partyAbbreviation: r.politician.currentParty?.abbreviation ?? null,
      effectivenessScore: r.politician.effectivenessScores[0]
        ? Number(r.politician.effectivenessScores[0].score)
        : null,
      corruptionScore: r.politician.corruptionScores[0]
        ? Number(r.politician.corruptionScores[0].score)
        : null,
      relationshipLabel: INVERSE_TYPES[r.relationshipType] ?? r.relationshipType,
      sourceUrl: r.sourceUrl,
    })),
  ];

  const effScore = politician.effectivenessScores[0];
  const corrScore = politician.corruptionScores[0];
  const age = politician.dateOfBirth
    ? Math.floor(
        (Date.now() - politician.dateOfBirth.getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: politician.fullName,
    birthDate: politician.dateOfBirth?.toISOString().split("T")[0],
    birthPlace: politician.placeOfBirth,
    image: politician.photoUrl,
    affiliation: politician.currentParty
      ? {
          "@type": "Organization",
          name: politician.currentParty.name,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DisclaimerBanner />

        {/* Profile header */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {politician.photoUrl ? (
              <Image
                src={politician.photoUrl}
                alt={politician.fullName}
                width={80}
                height={80}
                className="rounded-full object-cover w-20 h-20 flex-shrink-0"
                priority
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold flex-shrink-0">
                {politician.fullName[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{politician.fullName}</h1>
              {politician.currentParty && (
                <p className="text-gray-600 mt-0.5">{politician.currentParty.name}</p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-y-1.5 sm:grid-cols-2 sm:gap-x-8 text-sm">
                {age && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Age:</span>
                    <span className="text-gray-800">{age}</span>
                    <CorrectionLink politicianId={politician.id} fieldName="dateOfBirth" />
                  </div>
                )}
                {politician.gender && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Gender:</span>
                    <span className="text-gray-800">{politician.gender}</span>
                    <CorrectionLink politicianId={politician.id} fieldName="gender" />
                  </div>
                )}
                {politician.placeOfBirth && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Born:</span>
                    <span className="text-gray-800">{politician.placeOfBirth}</span>
                    <CorrectionLink politicianId={politician.id} fieldName="placeOfBirth" />
                  </div>
                )}
                {politician.highestEducation && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Education:</span>
                    <span className="text-gray-800">{politician.highestEducation}</span>
                    <CorrectionLink politicianId={politician.id} fieldName="highestEducation" />
                  </div>
                )}
                {politician.netWorthDeclared !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Net Worth:</span>
                    <span className="text-gray-800">
                      ₹{Number(politician.netWorthDeclared).toLocaleString("en-IN")}
                    </span>
                    {politician.netWorthSourceUrl && (
                      <SourceBadge sourceUrl={politician.netWorthSourceUrl} label="Net worth source" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreCard
            type="effectiveness"
            score={effScore ? Number(effScore.score) : null}
            rankNational={effScore?.rankNational ?? null}
            rankParty={effScore?.rankParty ?? null}
            rankState={effScore?.rankState ?? null}
            breakdown={effScore?.scoreBreakdown as Record<string, unknown>}
            algorithmVersion={effScore?.algorithmVersion}
            insufficientData={politician.attendanceRecords.length === 0}
          />
          <ScoreCard
            type="corruption"
            score={corrScore ? Number(corrScore.score) : null}
            rankNational={corrScore?.rankNational ?? null}
            rankParty={corrScore?.rankParty ?? null}
            rankState={corrScore?.rankState ?? null}
            breakdown={corrScore?.scoreBreakdown as Record<string, unknown>}
            algorithmVersion={corrScore?.algorithmVersion}
          />
        </div>

        {/* Election History */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Election History</h2>
          {politician.electionContests.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No verified records on file.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Year</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">House</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Constituency</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">State</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Result</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Vote Share</th>
                    <th className="px-4 py-2 text-xs text-gray-500">Src</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {politician.electionContests.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">{c.electionYear}</td>
                      <td className="px-4 py-2 text-gray-600">{c.electionType.replace("_", " ")}</td>
                      <td className="px-4 py-2">{c.constituency}</td>
                      <td className="px-4 py-2 text-gray-600">{c.state}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs font-medium ${
                            c.result === "WON" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {c.result}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {c.voteSharePercent ? `${Number(c.voteSharePercent).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <SourceBadge sourceUrl={c.sourceUrl} label="Election contest source" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>

        {/* Parliamentary Attendance */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Parliamentary Attendance</h2>
          {politician.attendanceRecords.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No verified records on file.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Session</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Year</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Attendance</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Questions</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Debates</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Bills</th>
                    <th className="px-4 py-2 text-xs text-gray-500">Src</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {politician.attendanceRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{r.sessionName}</td>
                      <td className="px-4 py-2 text-gray-600">{r.year}</td>
                      <td className="px-4 py-2 font-medium">
                        {Number(r.attendancePercentage).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-gray-600">{r.questionsRaised}</td>
                      <td className="px-4 py-2 text-gray-600">{r.debatesParticipated}</td>
                      <td className="px-4 py-2 text-gray-600">{r.privateBillsIntroduced}</td>
                      <td className="px-4 py-2">
                        <SourceBadge sourceUrl={r.sourceUrl} label="Attendance source" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>

        {/* Crime Records */}
        {politician.crimeRecords.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Crime Records</h2>
            <div className="space-y-3">
              {politician.crimeRecords.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.chargeDescription}</p>
                      {r.ipcSection && (
                        <p className="text-xs text-gray-500 mt-0.5">IPC Section: {r.ipcSection}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.caseStatus === "CONVICTED"
                            ? "bg-red-100 text-red-700"
                            : r.caseStatus === "ACQUITTED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.caseStatus}
                      </span>
                      <SourceBadge sourceUrl={r.sourceUrl} label="Crime record source" />
                    </div>
                  </div>
                  {r.courtName && (
                    <p className="text-xs text-gray-500 mt-1">Court: {r.courtName}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Achievements */}
        {politician.achievements.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Achievements</h2>
            <div className="space-y-3">
              {politician.achievements.map((a) => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                    </div>
                    <SourceBadge sourceUrl={a.sourceUrl} label="Achievement source" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs text-gray-400">{a.category}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{a.phase.replace("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Controversies */}
        {politician.controversies.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Controversies</h2>
            <div className="space-y-3">
              {politician.controversies.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{c.description}</p>
                    </div>
                    <SourceBadge sourceUrl={c.sourceUrl} label="Controversy source" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Family in Politics */}
        {familyMembers.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Family in Politics</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {familyMembers.map((member) => (
                <Link
                  key={`${member.slug}-${member.relationshipLabel}`}
                  href={`/politicians/${member.slug}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-start gap-3"
                >
                  {member.photoUrl ? (
                    <Image
                      src={member.photoUrl}
                      alt={member.fullName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-10 h-10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold flex-shrink-0">
                      {member.fullName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.fullName}</p>
                    <p className="text-xs text-blue-600 font-medium">{member.relationshipLabel}</p>
                    {member.partyAbbreviation && (
                      <p className="text-xs text-gray-500">{member.partyAbbreviation}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs">
                      {member.effectivenessScore !== null && (
                        <span className="text-blue-600">
                          E: {member.effectivenessScore.toFixed(1)}
                        </span>
                      )}
                      {member.corruptionScore !== null && (
                        <span className="text-red-600">
                          C: {member.corruptionScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <SourceBadge sourceUrl={member.sourceUrl} label="Relationship source" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
