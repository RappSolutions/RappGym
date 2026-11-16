/** Suggested loads hold only a plain kg number; any other text (ranges, settings, bands) moves to the note, never guessed into a number. */
export function splitSuggestedLoad(raw: string): { load: string; advice: string } {
  const text = raw.trim();
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return { load: text.replace(",", "."), advice: "" };
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*kg\b\s*(.*)$/i);
  if (!match) return { load: "", advice: text };
  return { load: (match[1] ?? "").replace(",", "."), advice: match[2]?.trim() ? text : "" };
}

export function appendLoadAdvice(note: string, advice: string) {
  return !advice || note.includes(advice) ? note : [note, advice].filter(Boolean).join("\n");
}
