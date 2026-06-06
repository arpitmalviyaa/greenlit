import { createServiceClient } from "@/lib/supabase/server";

export interface CorpusEntry {
  id: string;
  jurisdiction_code: string;
  content_type: 'statute' | 'judgment' | 'regulation' | 'news';
  title: string;
  content: string;
  source: string;
  source_url: string | null;
  last_updated: string | null;
  created_at: string;
}

export async function getRelevantCorpus(
  topics: string[],
  jurisdiction: string,
  limit = 5
): Promise<CorpusEntry[]> {
  if (!topics.length) return [];

  try {
    const supabase = await createServiceClient();

    // Build ILIKE filter — OR across all topics on title OR content
    const topicFilters = topics
      .slice(0, 5) // cap to avoid runaway query
      .flatMap((t) => [`title.ilike.%${t}%`, `content.ilike.%${t}%`]);

    const { data, error } = await supabase
      .from("jurisdiction_corpus")
      .select("*")
      .eq("jurisdiction_code", jurisdiction)
      .or(topicFilters.join(","))
      .order("last_updated", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as CorpusEntry[];
  } catch {
    return [];
  }
}

export function formatCorpusForPrompt(entries: CorpusEntry[]): string {
  if (!entries.length) return "";

  const MAX_TOTAL = 2000;
  const perEntry = Math.floor(MAX_TOTAL / entries.length);

  const blocks = entries.map((e) => {
    const body = e.content.length > perEntry
      ? e.content.slice(0, perEntry - 3) + "..."
      : e.content;
    return `[${e.source}] ${e.title}\n${body}`;
  });

  const joined = blocks.join("\n\n");
  return joined.length > MAX_TOTAL ? joined.slice(0, MAX_TOTAL - 3) + "..." : joined;
}
