import { Role } from '@epoch-judge/db';

export type ContestAccessUser = { id: string; role: Role };

/** Admin or contest creator may view a not-yet-started contest (no submit). */
export function canPreviewContestBeforeStart(
  contest: { startAt: Date; createdById: string | null },
  user: ContestAccessUser | undefined,
  now: Date = new Date(),
): boolean {
  if (now >= contest.startAt) return true;
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return Boolean(contest.createdById && contest.createdById === user.id);
}
