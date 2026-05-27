/** Prefix password-protected contests for display. */
export function formatContestTitle(
  title: string,
  requiresPassword?: boolean,
): string {
  return requiresPassword ? `🔐 ${title}` : title;
}
