export const ADMIN_TABS = [
  'dashboard',
  'problems',
  'contests',
  'announcements',
  'rejudge',
  'users',
  'judge',
  'config',
] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const PROBLEM_EDIT_SECTIONS = ['meta', 'testcases'] as const;
export type ProblemEditSection = (typeof PROBLEM_EDIT_SECTIONS)[number];

export function parseAdminTab(
  raw: string | null,
  opts?: { hasProblemEdit?: boolean },
): AdminTab {
  if (opts?.hasProblemEdit) return 'problems';
  if (raw && (ADMIN_TABS as readonly string[]).includes(raw)) {
    return raw as AdminTab;
  }
  return 'problems';
}

export function parseProblemEditSection(raw: string | null): ProblemEditSection {
  if (raw && (PROBLEM_EDIT_SECTIONS as readonly string[]).includes(raw)) {
    return raw as ProblemEditSection;
  }
  return 'meta';
}
