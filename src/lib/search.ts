/**
 * Lightweight client-side search scoring shared by the global command palette.
 * Substring match with weighted fields — no fuzzy matching, no dependency.
 */

type Searchable = {
  title?: string;
  question?: string; // FAQ uses `question` instead of `title`
  description?: string;
  tags?: string[];
  category?: string;
  subCategory?: string;
  author?: string;
};

export function scoreItem(item: Searchable, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const title = (item.title ?? item.question ?? "").toLowerCase();
  const description = (item.description ?? "").toLowerCase();
  const tags = (item.tags ?? []).join(" ").toLowerCase();
  const category = (item.category ?? "").toLowerCase();
  const subCategory = (item.subCategory ?? "").toLowerCase();
  const author = (item.author ?? "").toLowerCase();

  let score = 0;
  if (title.includes(q)) {
    score += 10;
    if (title.startsWith(q)) score += 5;
  }
  if (description.includes(q)) score += 3;
  if (tags.includes(q)) score += 4;
  if (category.includes(q) || subCategory.includes(q)) score += 2;
  if (author.includes(q)) score += 1;

  return score;
}

export function searchAll<T extends Searchable>(
  items: T[],
  query: string,
  limit = 8,
): T[] {
  const q = query.trim();
  if (!q) return [];
  return items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
