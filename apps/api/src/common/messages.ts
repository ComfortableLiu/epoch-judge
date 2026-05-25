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
    'zh-CN': '比赛未开始或已结束',
    'en-US': 'Contest is not active',
  },
  'security.forbidden_pattern': {
    'zh-CN': '代码包含不允许的模式',
    'en-US': 'Code contains forbidden patterns',
  },
};

export function t(key: string, locale: string): string {
  return messages[key]?.[locale] ?? messages[key]?.['zh-CN'] ?? key;
}
