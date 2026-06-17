import { useMutation } from '@tanstack/react-query';
import { Button, Card, Input, message, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function JoinClassPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [code, setCode] = useState('');

  const joinMut = useMutation({
    mutationFn: (invitationCode: string) =>
      api<{ classId: string; name: string }>('/classes/join', {
        method: 'POST',
        body: JSON.stringify({ invitationCode }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: (data) => {
      message.success(t('classes.joinSuccess', { name: data.name }));
      nav('/classes');
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <Card title={t('classes.joinTitle')} style={{ maxWidth: 480, margin: '40px auto' }}>
      <Typography.Paragraph>{t('classes.joinHint')}</Typography.Paragraph>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('classes.joinCodePlaceholder')}
          maxLength={6}
          style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.2em' }}
          onPressEnter={() => code.length === 6 && joinMut.mutate(code)}
        />
        <Button
          type="primary"
          loading={joinMut.isPending}
          disabled={code.length !== 6}
          onClick={() => joinMut.mutate(code)}
        >
          {t('classes.joinTitle')}
        </Button>
      </Space.Compact>
    </Card>
  );
}
