import { useState } from 'react';
import { Avatar, Button, Form, Input, List, Space, message } from 'antd';
import { LikeOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { MarkdownContent } from '../MarkdownContent';
import { useAuth } from '../../hooks/useAuth';

type Reply = {
  id: string;
  discussionId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null };
  voteCount: number;
};

type Props = {
  discussionId: string;
};

export function ReplyList({ discussionId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ items: Reply[]; total: number }>({
    queryKey: ['replies', discussionId, page],
    queryFn: () =>
      api(`/discussions/${discussionId}/replies?page=${page}`),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      api(`/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      message.success(t('discussions.replySuccess'));
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['replies', discussionId] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: (replyId: string) =>
      api(`/discussions/${discussionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', discussionId] });
    },
  });

  return (
    <div>
      <List
        loading={isLoading}
        dataSource={data?.items}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              user ? (
                <Button
                  type="text"
                  icon={<LikeOutlined />}
                  onClick={() => voteMutation.mutate(item.id)}
                >
                  {item.voteCount}
                </Button>
              ) : (
                <Space>
                  <LikeOutlined />
                  <span>{item.voteCount}</span>
                </Space>
              ),
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar>
                  {item.user.displayName?.[0] ?? item.user.username[0]}
                </Avatar>
              }
              title={item.user.displayName ?? item.user.username}
              description={
                <div>
                  <MarkdownContent content={item.content} />
                  <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {user && (
        <Form form={form} onFinish={(v) => replyMutation.mutate(v.content)}>
          <Form.Item name="content" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder={t('discussions.replyPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={replyMutation.isPending}>
              {t('discussions.reply')}
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
