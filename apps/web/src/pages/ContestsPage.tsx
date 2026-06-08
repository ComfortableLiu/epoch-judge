import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';
import { formatContestTitle } from '../lib/format-contest-title';
import { ContestListSkeleton } from '../components/skeleton';

type ContestStatus = 'upcoming' | 'running' | 'ended';

type ContestRow = {
  id: string;
  number: number;
  title: string;
  judgeMode: string;
  startAt: string;
  endAt: string;
  freezeAt: string | null;
  requiresPassword: boolean;
  problemCount: number;
  status: ContestStatus;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function statusTag(status: ContestStatus, t: (key: string) => string) {
  if (status === 'running') {
    return <Tag color="success">{t('contests.statusRunning')}</Tag>;
  }
  if (status === 'upcoming') {
    return <Tag color="processing">{t('contests.statusUpcoming')}</Tag>;
  }
  return <Tag>{t('contests.statusEnded')}</Tag>;
}

export function ContestsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: () => api<ContestRow[]>('/contests'),
  });

  const columns: ColumnsType<ContestRow> = useMemo(
    () => [
      {
        title: t('contests.colId'),
        dataIndex: 'number',
        key: 'number',
        width: 72,
        render: (n: number) => (
          <Link to={`/contests/${n}`}>{formatEntityId(n)}</Link>
        ),
      },
      {
        title: t('contests.colTitle'),
        key: 'title',
        render: (_, row) => (
          <Link to={`/contests/${row.number}`}>
            {formatContestTitle(row.title, row.requiresPassword)}
          </Link>
        ),
      },
      {
        title: t('contests.colStatus'),
        dataIndex: 'status',
        key: 'status',
        width: 96,
        render: (status: ContestStatus) => statusTag(status, t),
      },
      {
        title: t('contests.colJudgeMode'),
        dataIndex: 'judgeMode',
        key: 'judgeMode',
        width: 88,
        render: (mode: string) => <Tag>{mode}</Tag>,
      },
      {
        title: t('contests.colStart'),
        dataIndex: 'startAt',
        key: 'startAt',
        width: 168,
        render: (v: string) => (
          <span style={{ fontSize: 12 }}>{formatDateTime(v)}</span>
        ),
      },
      {
        title: t('contests.colEnd'),
        dataIndex: 'endAt',
        key: 'endAt',
        width: 168,
        render: (v: string) => (
          <span style={{ fontSize: 12 }}>{formatDateTime(v)}</span>
        ),
      },
      {
        title: t('contests.colProblems'),
        dataIndex: 'problemCount',
        key: 'problemCount',
        width: 72,
        align: 'center',
      },
      {
        title: t('contests.colAccess'),
        key: 'access',
        width: 88,
        render: (_, row) =>
          row.requiresPassword ? (
            <Tag color="warning">{t('contests.passwordRequired')}</Tag>
          ) : (
            <Tag>{t('contests.openAccess')}</Tag>
          ),
      },
    ],
    [t],
  );

  if (isLoading && !data) {
    return <ContestListSkeleton />;
  }

  return (
    <Card title={t('contests.title')}>
      <Table<ContestRow>
        rowKey="id"
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 960 }}
      />
    </Card>
  );
}
