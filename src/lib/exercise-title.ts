/** Only a whole HTTP(S) URL triggers title lookup; ordinary names stay untouched. */
export function exerciseNameUrl(value: string): string | null {
  const text = value.trim();
  if (!/^https?:\/\/\S+$/i.test(text) || text.length > 2000) return null;
  try {
    const url = new URL(text);
    return url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function preserveExerciseLink(instructions: string, url: string): string {
  return instructions.split(/\s+/).includes(url) ? instructions : `${instructions.trimEnd()}${instructions.trim() ? "\n" : ""}${url}`;
}

/** Prepend fetched description once; never drop what the admin already wrote. */
export function withExerciseDescription(instructions: string, description: string | null | undefined): string {
  const text = description?.trim();
  if (!text || instructions.includes(text)) return instructions;
  return instructions.trim() ? `${text}\n\n${instructions.trimStart()}` : text;
}
