const messages: Record<string, Record<string, string>> = {
  'auth.invalid_credentials': {
    'zh-CN': '用户名或密码错误',
    'en-US': 'Invalid username or password',
  },
  'auth.username_taken': {
    'zh-CN': '用户名已被占用',
    'en-US': 'Username already taken',
  },
  'auth.unauthorized': {
    'zh-CN': '未登录或会话已过期',
    'en-US': 'Unauthorized',
  },
  'problem.not_found': {
    'zh-CN': '题目不存在',
    'en-US': 'Problem not found',
  },
  'submission.not_found': {
    'zh-CN': '提交记录不存在',
    'en-US': 'Submission not found',
  },
  'contest.not_active': {
    'zh-CN': '比赛未开始或已结束，暂不可提交',
    'en-US': 'Contest is not active for submissions',
  },
  'contest.not_started': {
    'zh-CN': '比赛尚未开始，暂不可进入',
    'en-US': 'Contest has not started yet',
  },
  'contest.judge_mode_locked': {
    'zh-CN': '比赛已锁定评测模式，不可修改',
    'en-US': 'Judge mode is locked by the contest',
  },
  'contest.problem_not_in_contest': {
    'zh-CN': '该题目不属于本场比赛',
    'en-US': 'Problem is not in this contest',
  },
  'security.forbidden_pattern': {
    'zh-CN': '代码包含不允许的模式',
    'en-US': 'Code contains forbidden patterns',
  },
};

export function t(key: string, locale: string): string {
  return messages[key]?.[locale] ?? messages[key]?.['zh-CN'] ?? key;
}
