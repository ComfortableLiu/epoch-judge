import type { MessageInstance } from 'antd/es/message/interface';

let api: MessageInstance | null = null;

export function bindAppMessage(instance: MessageInstance) {
  api = instance;
}

function call<T extends keyof MessageInstance>(
  method: T,
  ...args: Parameters<MessageInstance[T]>
) {
  if (!api) {
    console.warn('[appMessage] App message API not ready yet');
    return;
  }
  return (api[method] as (...a: unknown[]) => unknown)(...args);
}

/** 与 antd App 上下文绑定的全局 message，勿直接 `import { message } from 'antd'` */
export const appMessage = {
  success: (...args: Parameters<MessageInstance['success']>) =>
    call('success', ...args),
  error: (...args: Parameters<MessageInstance['error']>) => call('error', ...args),
  info: (...args: Parameters<MessageInstance['info']>) => call('info', ...args),
  warning: (...args: Parameters<MessageInstance['warning']>) =>
    call('warning', ...args),
  loading: (...args: Parameters<MessageInstance['loading']>) =>
    call('loading', ...args),
  open: (...args: Parameters<MessageInstance['open']>) => call('open', ...args),
  destroy: (...args: Parameters<MessageInstance['destroy']>) =>
    call('destroy', ...args),
};
