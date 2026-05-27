import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Radio, Select, Typography } from 'antd';
import { appMessage } from '../lib/app-message';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useThemeMode } from '../hooks/useThemeMode';

const LANGS = ['JAVASCRIPT', 'PYTHON', 'JAVA', 'C', 'CPP'] as const;

type Profile = {
  preferredLanguage: string | null;
  preferredJudgeMode: string | null;
};

type PrefsPatch = {
  preferredLanguage: string;
  preferredJudgeMode: string;
};

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const qc = useQueryClient();
  const prefsReady = useRef(false);

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>('/users/me'),
  });

  const [preferredLanguage, setPreferredLanguage] = useState('PYTHON');
  const [preferredJudgeMode, setPreferredJudgeMode] = useState('ACM');

  useEffect(() => {
    if (!profile.data) return;
    prefsReady.current = false;
    setPreferredLanguage(profile.data.preferredLanguage ?? 'PYTHON');
    setPreferredJudgeMode(profile.data.preferredJudgeMode ?? 'ACM');
    queueMicrotask(() => {
      prefsReady.current = true;
    });
  }, [profile.data]);

  const savePrefs = useMutation({
    mutationFn: (body: PrefsPatch) =>
      api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => appMessage.error(e instanceof Error ? e.message : 'Error'),
  });

  const persistPrefs = useCallback(
    (patch: PrefsPatch) => {
      if (!prefsReady.current) return;
      savePrefs.mutate(patch);
    },
    [savePrefs],
  );

  return (
    <Card title={t('settings.title')}>
      <Typography.Title level={5}>{t('settings.judgePrefs')}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('settings.judgePrefsHint')}
      </Typography.Paragraph>
      <Typography.Paragraph>{t('settings.preferredLanguage')}</Typography.Paragraph>
      <Select
        style={{ width: 240, marginBottom: 16 }}
        loading={profile.isLoading || savePrefs.isPending}
        value={preferredLanguage}
        onChange={(lang) => {
          setPreferredLanguage(lang);
          persistPrefs({ preferredLanguage: lang, preferredJudgeMode });
        }}
        options={LANGS.map((l) => ({ value: l, label: l }))}
      />
      <Typography.Paragraph>{t('settings.preferredJudgeMode')}</Typography.Paragraph>
      <Select
        style={{ width: 240, marginBottom: 32 }}
        loading={profile.isLoading || savePrefs.isPending}
        value={preferredJudgeMode}
        onChange={(judgeMode) => {
          setPreferredJudgeMode(judgeMode);
          persistPrefs({ preferredLanguage, preferredJudgeMode: judgeMode });
        }}
        options={[
          { value: 'ACM', label: 'ACM' },
          { value: 'OI', label: 'OI' },
        ]}
      />

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
