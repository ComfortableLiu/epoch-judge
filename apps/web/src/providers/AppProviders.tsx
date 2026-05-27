import { App, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { PropsWithChildren, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useThemeMode } from '../hooks/useThemeMode';
import { AppMessageBridge } from './AppMessageBridge';

function AntdConfig({ children }: PropsWithChildren) {
  const { i18n } = useTranslation();
  const { resolved } = useThemeMode();
  const antdLocale = i18n.language === 'en-US' ? enUS : zhCN;

  const algorithm = useMemo(() => {
    if (resolved === 'dark') return theme.darkAlgorithm;
    return theme.defaultAlgorithm;
  }, [resolved]);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm,
        token: {
          colorPrimary: '#3b5bdb',
          borderRadius: 8,
        },
      }}
    >
      <App message={{ top: 64, maxCount: 3 }}>
        <AppMessageBridge>{children}</AppMessageBridge>
      </App>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AntdConfig>{children}</AntdConfig>
    </ThemeProvider>
  );
}
