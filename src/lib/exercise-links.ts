export type InstructionPart = { text: string; href?: string };

/** Preserve the text verbatim; only explicit HTTP(S) URLs become links. */
export function instructionParts(text: string): InstructionPart[] {
  const parts: InstructionPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const start = match.index;
    let href = match[0].replace(/[.,!?;:]+$/, "");
    while (href.endsWith(")") && (href.match(/\)/g)?.length ?? 0) > (href.match(/\(/g)?.length ?? 0)) href = href.slice(0, -1);
    try {
      const url = new URL(href);
      if (!url.hostname || url.username || url.password) continue;
    } catch { continue; }
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: href, href });
    cursor = start + href.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export function youtubePreview(instructions: string | null | undefined): { href: string; image: string } | null {
  for (const part of instructionParts(instructions ?? "")) {
    if (!part.href) continue;
    const url = new URL(part.href);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    let id: string | null | undefined;
    if (host === "youtu.be") id = segments[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (["shorts", "embed", "live"].includes(segments[0] ?? "")) id = segments[1];
    }
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return { href: part.href, image: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  }
  return null;
}

/** Derived presentation only: never write a fallback into exercise.image_urls. */
export function exerciseYoutubeFallback(storedImages: readonly string[], instructions: string | null | undefined) {
  return storedImages.length ? null : youtubePreview(instructions);
}