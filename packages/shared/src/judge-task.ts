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
  /** 可选；省略时由 Worker 按 problemId 从数据库加载（同题共享，队列不传测例元数据） */
  testcases?: JudgeTestcasePayload[];
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
