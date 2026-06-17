import { Avatar, List, Tag, Typography, Space, Pagination } from 'antd';
import { MessageOutlined, LikeOutlined, PushpinOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

type Discussion = {
  id: string;
  type: 'QUESTION' | 'SOLUTION';
  title: string;
  isPinned: boolean;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null };
  replyCount: number;
  voteCount: number;
};

type Props = {
  discussions: Discussion[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function PostList({ discussions, total, page, limit, onPageChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <List
        dataSource={discussions}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Space key="votes">
                <LikeOutlined />
                <span>{item.voteCount}</span>
              </Space>,
              <Space key="replies">
                <MessageOutlined />
                <span>{item.replyCount}</span>
              </Space>,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar>{item.user.displayName?.[0] ?? item.user.username[0]}</Avatar>}
              title={
                <Space>
                  {item.isPinned && (
                    <Tag icon={<PushpinOutlined />} color="gold">
                      {t('discussions.pinned')}
                    </Tag>
                  )}
                  <Tag color={item.type === 'QUESTION' ? 'blue' : 'green'}>
                    {item.type === 'QUESTION'
                      ? t('discussions.question')
                      : t('discussions.solution')}
                  </Tag>
                  <Link to={`/discussions/${item.id}`}>{item.title}</Link>
                </Space>
              }
              description={
                <Space>
                  <Text type="secondary">
                    {item.user.displayName ?? item.user.username}
                  </Text>
                  <Text type="secondary">·</Text>
                  <Text type="secondary">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
      {total > limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={limit}
            onChange={onPageChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </>
  );
}
