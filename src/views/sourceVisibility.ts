export function syncVisibleSources(visible: Set<string>, known: Set<string>, sourceIds: string[]): void {
  const nextKnown = new Set(sourceIds);
  for (const sourceId of sourceIds) {
    if (!known.has(sourceId)) {
      visible.add(sourceId);
    }
  }
  for (const sourceId of Array.from(visible)) {
    if (!nextKnown.has(sourceId)) {
      visible.delete(sourceId);
    }
  }
  known.clear();
  for (const sourceId of nextKnown) {
    known.add(sourceId);
  }
}
