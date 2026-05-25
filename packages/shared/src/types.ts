import type { JudgeMode, Language, Role, SubmissionStatus } from './enums';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
}

export interface UserProfileDto {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  createdAt: string;
}

export interface ProblemSummaryDto {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  visibility: string;
  defaultJudgeMode: JudgeMode;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface SubmissionDto {
  id: string;
  problemId: string;
  userId: string;
  language: Language;
  judgeMode: JudgeMode;
  status: SubmissionStatus;
  score: number | null;
  timeMs: number | null;
  memoryKb: number | null;
  createdAt: string;
}
