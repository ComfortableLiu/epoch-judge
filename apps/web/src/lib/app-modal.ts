import type { HookAPI } from 'antd/es/modal/useModal';

let api: HookAPI | null = null;

export function bindAppModal(instance: HookAPI) {
  api = instance;
}

export const appModal = {
  confirm: (...args: Parameters<HookAPI['confirm']>) => {
    if (!api) {
      console.warn('[appModal] App modal API not ready yet');
      return;
    }
    return api.confirm(...args);
  },
};
