import { Card, Radio, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../hooks/useThemeMode';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <Card title={t('settings.title')}>
      <Typography.Paragraph>{t('settings.language')}</Typography.Paragraph>
      <Select
        style={{ width: 200, marginBottom: 24 }}
        value={i18n.language}
        onChange={(lng) => {
          void i18n.changeLanguage(lng);
          localStorage.setItem('epoch.locale', lng);
        }}
        options={[
          { value: 'zh-CN', label: '简体中文' },
          { value: 'en-US', label: 'English' },
        ]}
      />
      <Typography.Paragraph>{t('settings.theme')}</Typography.Paragraph>
      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
        <Radio.Button value="light">{t('settings.themeLight')}</Radio.Button>
        <Radio.Button value="dark">{t('settings.themeDark')}</Radio.Button>
        <Radio.Button value="system">{t('settings.themeSystem')}</Radio.Button>
      </Radio.Group>
    </Card>
  );
}
