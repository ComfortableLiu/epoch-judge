export class ProblemTagsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProblemTagsValidationError';
  }
}

/** Normalize problem tags: trim, dedupe (first wins), max 5, each 1–10 chars. */
export function normalizeProblemTags(input: unknown): string[] {
  if (input == null) return [];
  if (!Array.isArray(input)) {
    throw new ProblemTagsValidationError('Tags must be an array of strings');
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new ProblemTagsValidationError('Each tag must be a string');
    }
    const tag = raw.trim();
    if (!tag) continue;
    if (tag.length > 10) {
      throw new ProblemTagsValidationError(
        `Tag "${tag.slice(0, 12)}…" exceeds 10 characters`,
      );
    }
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length > 5) {
      throw new ProblemTagsValidationError('At most 5 tags per problem');
    }
  }

  return out;
}

export function tagsFromDb(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}
