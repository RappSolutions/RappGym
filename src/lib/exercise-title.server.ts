import { Parser } from "htmlparser2";
import ipaddr from "ipaddr.js";
import { exerciseNameUrl } from "./exercise-title";
import { youtubePreview } from "./exercise-links";

export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

export function titleFromHtml(html: string): string | null {
  let title = "", og = "", inTitle = false;
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "title") inTitle = true;
      if (name === "meta" && (attrs["property"] ?? attrs["name"])?.toLowerCase() === "og:title") og ||= attrs["content"] ?? "";
    },
    ontext(text) { if (inTitle) title += text; },
    onclosetag(name) { if (name === "title") inTitle = false; },
  }, { decodeEntities: true });
  parser.end(html);
  return cleanTitle(og || title);
}

function cleanTitle(title: string): string | null {
  return title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;
}

async function validateDestination(url: URL, signal: AbortSignal) {
  if (!exerciseNameUrl(url.href) || url.port || !url.hostname.includes(".") || ipaddr.isValid(url.hostname.replace(/^\[|\]$/g, ""))) throw new Error("Unsafe URL");
  const host = url.hostname.toLowerCase();
  if (/\.(localhost|local|internal|test|invalid)$/.test(host)) throw new Error("Unsafe host");
  const records = await Promise.all(["A", "AAAA"].map(async (type) => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" }, signal });
    if (!response.ok) throw new Error("DNS lookup failed");
    const json = await response.json() as { Status?: number; Answer?: { type: number; data: string }[] };
    if (json.Status !== 0) throw new Error("DNS lookup failed");
    return (json.Answer ?? []).filter((record) => record.type === 1 || record.type === 28).map((record) => record.data);
  }));
  const addresses = records.flat();
  if (!addresses.length || addresses.some((address) => !publicAddress(address))) throw new Error("Unsafe address");
}

async function boundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "", bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512_000) throw new Error("Page too large");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel(); }
}

export function descriptionFromHtml(html: string): string | null {
  let description = "";
  const parser = new Parser({
    onopentag(name, attrs) {
      const key = (attrs["property"] ?? attrs["name"])?.toLowerCase();
      if (name === "meta" && (key === "og:description" || key === "description")) description ||= attrs["content"] ?? "";
    },
  }, { decodeEntities: true });
  parser.write(html); parser.end();
  return description.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, 2000) || null;
}

export async function fetchExerciseTitle(input: string): Promise<string | null> {
  return (await fetchExerciseDetails(input)).title;
}

/** YouTube adds creator and the public meta description; other pages only give a title. */
export async function fetchExerciseDetails(input: string): Promise<{ title: string | null; description: string | null }> {
  const none = { title: null, description: null };
  try {
    const parsed = exerciseNameUrl(input);
    if (!parsed) return none;
    const signal = AbortSignal.timeout(8000);
    const youtube = youtubePreview(parsed);
    if (youtube) {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtube.href)}&format=json`, { signal, redirect: "manual" });
      if (!response.ok) return none;
      const json = JSON.parse(await boundedText(response)) as { title?: unknown; author_name?: unknown };
      const title = typeof json.title === "string" ? cleanTitle(json.title) : null;
      const author = typeof json.author_name === "string" ? cleanTitle(json.author_name) : null;
      let summary: string | null = null;
      try {
        const page = await fetch(youtube.href, { signal, redirect: "manual", headers: { accept: "text/html", "accept-language": "en" } });
        summary = page.ok ? descriptionFromHtml(await boundedText(page)) : null;
        if (!page.ok) await page.body?.cancel();
      } catch { summary = null; }
      const description = [author ? `Video: ${author}` : null, summary].filter(Boolean).join("\n") || null;
      return { title, description };
    }
    let url = new URL(parsed);
    for (let redirects = 0; redirects <= 3; redirects++) {
      await validateDestination(url, signal);
      const response = await fetch(url.href, { redirect: "manual", signal, headers: { accept: "text/html" } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) return none;
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) { await response.body?.cancel(); return none; }
      return { title: titleFromHtml(await boundedText(response)), description: null };
    }
    return none;
  } catch { return none; }
}