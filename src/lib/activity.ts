export function reviewsLast14Days(log: Record<string, number> | undefined): number[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(todayStr);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    return (log ?? {})[d.toISOString().slice(0, 10)] ?? 0;
  });
}
