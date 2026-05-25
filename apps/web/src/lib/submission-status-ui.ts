const TERMINAL_STATUSES = new Set([
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILE_ERROR',
  'SECURITY_ERROR',
  'SYSTEM_ERROR',
]);

export function isSubmissionTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function hasPendingSubmissions(
  submissions: { status: string }[] | undefined,
): boolean {
  return submissions?.some((s) => !isSubmissionTerminal(s.status)) ?? false;
}

export function submissionStatusColor(status: string): string {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'QUEUED' || status === 'PENDING') return 'default';
  if (
    status === 'JUDGING' ||
    status === 'COMPILING' ||
    status === 'RUNNING'
  ) {
    return 'processing';
  }
  if (status === 'WRONG_ANSWER') return 'error';
  return 'warning';
}
