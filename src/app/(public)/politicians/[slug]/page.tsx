import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/db/client";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { SourceBadge } from "@/components/politician/source-badge";
import { CorrectionLink } from "@/components/politician/correction-link";
import { ScoreCard } from "@/components/politician/score-card";
import { AdZone } from "@/components/layout/ad-zone";
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
    },
  });

  if (!politician) notFound();

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
          <div className="flex items-start gap-6">
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
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
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

        <AdZone zoneKey="profile-mid" className="mt-6" />

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
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
          )}
        </section>

        {/* Parliamentary Attendance */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Parliamentary Attendance</h2>
          {politician.attendanceRecords.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No verified records on file.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
      </div>
    </>
  );
}
