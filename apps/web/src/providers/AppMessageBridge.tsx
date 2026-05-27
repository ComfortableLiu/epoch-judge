import { App } from 'antd';
import { useLayoutEffect, type PropsWithChildren } from 'react';
import { bindAppMessage } from '../lib/app-message';
import { bindAppModal } from '../lib/app-modal';

/** 将 App.useApp() 的 message / modal 绑定到全局封装，供全站使用 */
export function AppMessageBridge({ children }: PropsWithChildren) {
  const { message, modal } = App.useApp();

  useLayoutEffect(() => {
    bindAppMessage(message);
    bindAppModal(modal);
  }, [message, modal]);

  return children;
}
