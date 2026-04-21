export interface AggregatorProspect {
  name: string;
  position: string;
}

export function countDraftedAtPosition(
  userPicks: Record<string, string>,
  consensusBoard: readonly AggregatorProspect[],
  pos: string,
): string[] {
  return Object.entries(userPicks)
    .filter(([, name]) => consensusBoard.find((p) => p.name === name)?.position === pos)
    .map(([, name]) => name);
}
