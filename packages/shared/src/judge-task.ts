import type { JudgeMode, Language } from './enums';

export interface JudgeTestcasePayload {
  id: string;
  inputKey: string;
  outputKey: string;
  score: number;
}

export interface JudgeTaskPayload {
  submissionId: string;
  problemId: string;
  language: Language;
  judgeMode: JudgeMode;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  testcases: JudgeTestcasePayload[];
}

export interface JudgeEventPayload {
  submissionId: string;
  type: 'status' | 'testcase' | 'done';
  status?: string;
  testcaseId?: string;
  verdict?: string;
  score?: number;
  timeMs?: number;
  memoryKb?: number;
}
