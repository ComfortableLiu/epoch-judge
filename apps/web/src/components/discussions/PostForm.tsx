import { useState } from 'react';
import { Button, Card, Form, Input, Radio, Space, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

type Props = {
  problemNumber: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PostForm({ problemNumber, onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [preview, setPreview] = useState(false);

  const createMutation = useMutation({
    mutationFn: (values: { type: string; title: string; content: string }) =>
      api(`/discussions/problems/${problemNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      message.success(t('discussions.createSuccess'));
      onSuccess();
    },
  });

  return (
    <Card title={t('discussions.newPost')}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
        initialValues={{ type: 'QUESTION' }}
      >
        <Form.Item
          name="type"
          label={t('discussions.postType')}
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio.Button value="QUESTION">{t('discussions.question')}</Radio.Button>
            <Radio.Button value="SOLUTION">{t('discussions.solution')}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="title"
          label={t('discussions.titleLabel')}
          rules={[{ required: true, message: t('discussions.titleRequired') }]}
        >
          <Input placeholder={t('discussions.titlePlaceholder')} />
        </Form.Item>

        <Form.Item
          name="content"
          label={t('discussions.contentLabel')}
          rules={[{ required: true, message: t('discussions.contentRequired') }]}
        >
          <Input.TextArea
            rows={8}
            placeholder={t('discussions.contentPlaceholder')}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
            >
              {t('discussions.submit')}
            </Button>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
