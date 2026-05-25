import { useQuery } from '@tanstack/react-query';
import { Card, List, Table, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';

export function ContestDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();

  const { data: contest, isLoading } = useQuery({
    queryKey: ['contest', slug],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        description: string;
        judgeMode: string;
        startAt: string;
        endAt: string;
        freezeAt: string | null;
        problems: { label: string; problem: { slug: string; title: string } }[];
      }>(`/contests/${slug}`),
    enabled: Boolean(slug),
  });

  const { data: scoreboard } = useQuery({
    queryKey: ['contest-scoreboard', contest?.id],
    queryFn: () =>
      api<{ userId: string; username: string; score?: number; solved?: number; penalty?: number }[]>(
        `/contests/${contest!.id}/scoreboard`,
      ),
    enabled: Boolean(contest?.id),
    refetchInterval: 10000,
  });

  useBreadcrumbLabel(contest?.title ?? slug);

  return (
    <div>
      <Card loading={isLoading} title={contest?.title}>
        <Tag>{contest?.judgeMode}</Tag>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {contest?.description}
        </Typography.Paragraph>
        {contest?.freezeAt && (
          <Typography.Text type="secondary">
            Freeze: {new Date(contest.freezeAt).toLocaleString()}
          </Typography.Text>
        )}
      </Card>

      <Card title={t('nav.problems')} style={{ marginTop: 16 }}>
        <List
          dataSource={contest?.problems ?? []}
          renderItem={(p) => (
            <List.Item>
              <Tag>{p.label}</Tag>
              <Link to={`/problems/${p.problem.slug}`}>{p.problem.title}</Link>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Scoreboard" style={{ marginTop: 16 }}>
        <Table
          dataSource={scoreboard ?? []}
          rowKey="userId"
          pagination={false}
          columns={
            contest?.judgeMode === 'OI'
              ? [
                  { title: 'User', dataIndex: 'username' },
                  { title: 'Score', dataIndex: 'score' },
                ]
              : [
                  { title: 'User', dataIndex: 'username' },
                  { title: 'Solved', dataIndex: 'solved' },
                  { title: 'Penalty', dataIndex: 'penalty' },
                ]
          }
        />
      </Card>
    </div>
  );
}
