import { Button, Card, Form, Input } from 'antd';
import { useEffect } from 'react';
import { appMessage } from '../lib/app-message';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, consumeAuthRedirectMessage, setToken } from '../api/client';

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  useEffect(() => {
    const msg = consumeAuthRedirectMessage();
    if (msg) appMessage.warning(msg);
  }, []);

  return (
    <Card title={t('nav.login')} style={{ maxWidth: 400, margin: '0 auto' }}>
      <Form
        layout="vertical"
        onFinish={async (v) => {
          try {
            const res = await api<{ accessToken: string }>('/auth/login', {
              method: 'POST',
              body: JSON.stringify(v),
            });
            setToken(res.accessToken);
            appMessage.success('登录成功');
            const target =
              redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
                ? redirectTo
                : '/problems';
            nav(target);
          } catch (e) {
            appMessage.error(e instanceof Error ? e.message : 'Error');
          }
        }}
      >
        <Form.Item name="username" label={t('auth.username')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="password" label={t('auth.password')} rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          {t('nav.login')}
        </Button>
      </Form>
    </Card>
  );
}
