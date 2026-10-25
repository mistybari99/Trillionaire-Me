// Wikipedia search provider (free, no key). The ONLY file allowed to touch the network (checked in tests).
import type { SearchProvider } from "../core/research";

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export function wikipedia(lang: "bn" | "en", doFetch: Fetch = (u, i) => fetch(u, i)): SearchProvider {
  const host = `https://${lang}.wikipedia.org`;
  return {
    name: `wikipedia-${lang}`,
    async search(query, signal) {
      const url = `${host}/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srprop=snippet&srsearch=${encodeURIComponent(query)}`;
      const res = await doFetch(url, { signal });
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as { query?: { search?: { title: string; snippet: string }[] } };
      return (data.query?.search ?? []).map((r) => ({
        title: stripTags(r.title), snippet: stripTags(r.snippet),
        sourceName: lang === "bn" ? "Wikipedia (বাংলা)" : "Wikipedia",
        sourceUrl: `${host}/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      }));
    },
  };
}
