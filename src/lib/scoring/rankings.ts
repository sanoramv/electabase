interface ScoreRecord {
  politicianId: string;
  score: number;
  partyId?: string | null;
  state?: string | null;
}

interface RankedRecord extends ScoreRecord {
  rankNational: number;
  rankParty: number | null;
  rankState: number | null;
}

function assignRanks(records: ScoreRecord[], descending = true): Map<string, number> {
  const sorted = [...records].sort((a, b) =>
    descending ? b.score - a.score : a.score - b.score
  );
  const rankMap = new Map<string, number>();
  sorted.forEach((r, i) => rankMap.set(r.politicianId, i + 1));
  return rankMap;
}

export function computeRankings(records: ScoreRecord[], descending = true): RankedRecord[] {
  const nationalRanks = assignRanks(records, descending);

  // Group by party
  const byParty = new Map<string, ScoreRecord[]>();
  records.forEach((r) => {
    if (r.partyId) {
      const group = byParty.get(r.partyId) ?? [];
      group.push(r);
      byParty.set(r.partyId, group);
    }
  });
  const partyRanks = new Map<string, Map<string, number>>();
  byParty.forEach((group, partyId) => {
    partyRanks.set(partyId, assignRanks(group, descending));
  });

  // Group by state
  const byState = new Map<string, ScoreRecord[]>();
  records.forEach((r) => {
    if (r.state) {
      const group = byState.get(r.state) ?? [];
      group.push(r);
      byState.set(r.state, group);
    }
  });
  const stateRanks = new Map<string, Map<string, number>>();
  byState.forEach((group, state) => {
    stateRanks.set(state, assignRanks(group, descending));
  });

  return records.map((r) => ({
    ...r,
    rankNational: nationalRanks.get(r.politicianId)!,
    rankParty: r.partyId
      ? (partyRanks.get(r.partyId)?.get(r.politicianId) ?? null)
      : null,
    rankState: r.state
      ? (stateRanks.get(r.state)?.get(r.politicianId) ?? null)
      : null,
  }));
}
