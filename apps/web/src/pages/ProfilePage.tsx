import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Descriptions, Form, Input, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { appMessage } from '../lib/app-message';
import { api } from '../api/client';

const DISPLAY_NAME_MAX = 64;

type Profile = {
  username: string;
  email: string | null;
  displayName: string | null;
  role: string;
};

export function ProfilePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [profileForm] = Form.useForm<{ displayName: string }>();
  const [passwordForm] = Form.useForm<{
    currentPassword: string;
    newPassword: string;
    confirm: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>('/users/me'),
  });

  useEffect(() => {
    if (!data) return;
    profileForm.setFieldsValue({ displayName: data.displayName ?? '' });
  }, [data, profileForm]);

  const updateProfile = useMutation({
    mutationFn: (values: { displayName: string }) =>
      api<Profile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: values.displayName.trim(),
        }),
      }),
    onSuccess: (profile) => {
      appMessage.success(t('profile.profileUpdated'));
      profileForm.setFieldsValue({ displayName: profile.displayName ?? '' });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      api('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      }),
    onSuccess: () => {
      appMessage.success(t('profile.passwordUpdated'));
      passwordForm.resetFields();
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  return (
    <Card loading={isLoading}>
      <Descriptions column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('auth.username')}>{data?.username}</Descriptions.Item>
        <Descriptions.Item label={t('auth.email')}>{data?.email ?? '—'}</Descriptions.Item>
        <Descriptions.Item label={t('profile.displayName')}>
          {data?.displayName ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('profile.role')}>{data?.role}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t('profile.editProfile')}
      </Typography.Title>
      <Form
        form={profileForm}
        layout="vertical"
        style={{ maxWidth: 400, marginBottom: 32 }}
        onFinish={(v) => updateProfile.mutate(v)}
      >
        <Form.Item
          name="displayName"
          label={t('profile.displayName')}
          extra={t('profile.displayNameHint')}
          rules={[{ max: DISPLAY_NAME_MAX, message: t('profile.displayNameTooLong') }]}
        >
          <Input placeholder={t('profile.displayNamePlaceholder')} maxLength={DISPLAY_NAME_MAX} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
          {t('profile.saveProfile')}
        </Button>
      </Form>

      <Typography.Title level={5}>{t('profile.changePassword')}</Typography.Title>
      <Form
        form={passwordForm}
        layout="vertical"
        style={{ maxWidth: 400 }}
        onFinish={(v) =>
          changePassword.mutate({
            currentPassword: v.currentPassword,
            newPassword: v.newPassword,
          })
        }
      >
        <Form.Item
          name="currentPassword"
          label={t('profile.currentPassword')}
          rules={[{ required: true, message: t('profile.currentPasswordRequired') }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('profile.newPassword')}
          rules={[
            { required: true, message: t('profile.newPasswordRequired') },
            { min: 8, message: t('profile.newPasswordMin') },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('profile.confirmPassword')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('profile.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('profile.passwordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
          {t('profile.updatePassword')}
        </Button>
      </Form>
    </Card>
  );
}
