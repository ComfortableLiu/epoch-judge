import { Button, Card, Form, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();

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
            message.success('OK');
            nav('/problems');
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Error');
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
