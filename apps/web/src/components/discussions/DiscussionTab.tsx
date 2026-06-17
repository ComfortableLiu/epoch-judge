import { useState } from 'react';
import { Button, Space, Select, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { PostForm } from './PostForm';
import { PostList } from './PostList';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  problemNumber: number;
};

type Discussion = {
  id: string;
  problemId: string;
  userId: string;
  type: 'QUESTION' | 'SOLUTION';
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; displayName: string | null };
  replyCount: number;
  voteCount: number;
};

type DiscussionsResponse = {
  items: Discussion[];
  total: number;
  page: number;
  limit: number;
};

export function DiscussionTab({ problemNumber }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');

  const { data, isLoading, refetch } = useQuery<DiscussionsResponse>({
    queryKey: ['discussions', problemNumber, page, sort],
    queryFn: () =>
      api(`/discussions/problems/${problemNumber}?page=${page}&sort=${sort}`),
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={[
              { label: t('discussions.sortLatest'), value: 'latest' },
              { label: t('discussions.sortPopular'), value: 'popular' },
            ]}
            style={{ width: 120 }}
          />
        </Space>
        {user && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowForm(!showForm)}
          >
            {t('discussions.newPost')}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ marginBottom: 16 }}>
          <PostForm
            problemNumber={problemNumber}
            onSuccess={() => {
              setShowForm(false);
              refetch();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <PostList
          discussions={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          limit={data?.limit ?? 20}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
