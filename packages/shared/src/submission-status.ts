import { SubmissionStatus } from './enums';

const TERMINAL_STATUSES = new Set<string>([
  SubmissionStatus.ACCEPTED,
  SubmissionStatus.WRONG_ANSWER,
  SubmissionStatus.TIME_LIMIT_EXCEEDED,
  SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
  SubmissionStatus.RUNTIME_ERROR,
  SubmissionStatus.COMPILE_ERROR,
  SubmissionStatus.SECURITY_ERROR,
  SubmissionStatus.SYSTEM_ERROR,
]);

export function isSubmissionTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

const IN_FLIGHT_STATUSES = new Set<string>([
  SubmissionStatus.PENDING,
  SubmissionStatus.QUEUED,
  SubmissionStatus.JUDGING,
  SubmissionStatus.COMPILING,
  SubmissionStatus.RUNNING,
  SubmissionStatus.REJUDGE_QUEUED,
  SubmissionStatus.REJUDGING,
]);

export function isSubmissionInFlight(status: string): boolean {
  return IN_FLIGHT_STATUSES.has(status);
}

export function hasPendingSubmissions(
  submissions: { status: string }[] | undefined,
): boolean {
  return submissions?.some((s) => !isSubmissionTerminal(s.status)) ?? false;
}
