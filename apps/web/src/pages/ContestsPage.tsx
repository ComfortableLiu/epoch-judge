import { useQuery } from '@tanstack/react-query';
import { Card, List, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export function ContestsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: () =>
      api<{ id: string; title: string; slug: string; judgeMode: string }[]>(
        '/contests',
      ),
  });

  return (
    <Card title={t('nav.contests')} loading={isLoading}>
      <List
        dataSource={data ?? []}
        renderItem={(c) => (
            <List.Item>
              <Link to={`/contests/${c.slug}`}>{c.title}</Link> <Tag>{c.judgeMode}</Tag>
            </List.Item>
        )}
      />
    </Card>
  );
}
