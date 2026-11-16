/** Split explicit single kg proposals only; never guess ranges, band resistance or completed weights. */
export function splitSuggestedLoad(raw: string): { load: string; advice: string } {
  const match = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*kg\b\s*(.*)$/i);
  if (!match) return { load: raw, advice: "" };
  return { load: (match[1] ?? "").replace(",", "."), advice: match[2]?.trim() ? raw.trim() : "" };
}

export function appendLoadAdvice(note: string, advice: string) {
  return !advice || note.includes(advice) ? note : [note, advice].filter(Boolean).join("\n");
}