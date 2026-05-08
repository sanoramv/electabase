import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const party = await db.party.findUnique({ where: { slug }, select: { name: true, abbreviation: true } });
  if (!party) return { title: "Party Not Found" };
  return {
    title: `${party.name} (${party.abbreviation})`,
    description: `All politicians affiliated with ${party.name} — scores, records, and election history.`,
  };
}

export default async function PartyProfilePage({ params }: Props) {
  const { slug } = await params;

  const party = await db.party.findUnique({
    where: { slug },
    include: {
      currentMembers: {
        where: { isPublished: true },
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          slug: true,
          fullName: true,
          photoUrl: true,
          effectivenessScores: {
            orderBy: { computedAt: "desc" },
            take: 1,
            select: { score: true, rankNational: true },
          },
          corruptionScores: {
            orderBy: { computedAt: "desc" },
            take: 1,
            select: { score: true, rankNational: true },
          },
          attendanceRecords: {
            orderBy: { year: "desc" },
            take: 3,
            select: { attendancePercentage: true },
          },
        },
      },
    },
  });

  if (!party) notFound();

  const members = party.currentMembers;
  const avgEffectiveness =
    members.length > 0
      ? members.reduce((s, m) => s + Number(m.effectivenessScores[0]?.score ?? 0), 0) / members.length
      : null;
  const avgCorruption =
    members.length > 0
      ? members.reduce((s, m) => s + Number(m.corruptionScores[0]?.score ?? 0), 0) / members.length
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Party header */}
      <div className="flex items-center gap-4 mb-8">
        {party.logoUrl && (
          <img src={party.logoUrl} alt={`${party.name} logo`} className="w-16 h-16 object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
          <p className="text-gray-500 text-sm">
            {party.abbreviation}
            {party.foundedYear && ` · Founded ${party.foundedYear}`}
          </p>
          {party.sourceUrl && (
            <a
              href={party.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
            >
              🔗 Official source
            </a>
          )}
        </div>
      </div>

      {/* Aggregate scores */}
      {(avgEffectiveness !== null || avgCorruption !== null) && (
        <section className="mb-8 grid grid-cols-2 gap-4">
          {avgEffectiveness !== null && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Avg. Effectiveness</p>
              <p className="text-2xl font-bold text-blue-600">{avgEffectiveness.toFixed(1)}</p>
              <p className="text-xs text-gray-400">{members.length} members</p>
            </div>
          )}
          {avgCorruption !== null && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Avg. Corruption</p>
              <p className="text-2xl font-bold text-red-600">{avgCorruption.toFixed(1)}</p>
              <p className="text-xs text-gray-400">{members.length} members</p>
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No published members on file.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/politicians/${m.slug}`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300"
              >
                {m.photoUrl && (
                  <img
                    src={m.photoUrl}
                    alt={m.fullName}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.fullName}</p>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Eff.</p>
                    <p className="text-sm font-bold text-blue-600">
                      {m.effectivenessScores[0] ? Number(m.effectivenessScores[0].score).toFixed(1) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Corr.</p>
                    <p className="text-sm font-bold text-red-600">
                      {m.corruptionScores[0] ? Number(m.corruptionScores[0].score).toFixed(1) : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
