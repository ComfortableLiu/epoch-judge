import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Locale = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const header = req.headers['x-locale'] ?? req.headers['accept-language'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return 'zh-CN';
  return raw.startsWith('en') ? 'en-US' : 'zh-CN';
});
