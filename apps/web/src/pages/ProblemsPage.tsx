import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';

type PassStatus = 'PASSED' | 'FAILED' | 'NONE' | null;

interface ProblemRow {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  passStatus: PassStatus;
}

function passStatusTag(
  status: PassStatus,
  t: (key: string) => string,
): ReactNode {
  if (status === null) {
    return <Tag>{t('problems.passUnknown')}</Tag>;
  }
  if (status === 'PASSED') {
    return <Tag color="success">{t('problems.passPassed')}</Tag>;
  }
  if (status === 'FAILED') {
    return <Tag color="warning">{t('problems.passFailed')}</Tag>;
  }
  return <Tag>{t('problems.passNone')}</Tag>;
}

export function ProblemsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: () => api<ProblemRow[]>('/problems'),
  });

  const columns: ColumnsType<ProblemRow> = useMemo(
    () => [
      {
        title: t('problems.colId'),
        dataIndex: 'number',
        key: 'number',
        width: 72,
        render: (n: number) => (
          <Link to={`/problems/${n}`}>{formatEntityId(n)}</Link>
        ),
      },
      {
        title: t('problems.colTitle'),
        key: 'title',
        render: (_, row) => (
          <Link to={`/problems/${row.number}`}>{row.title}</Link>
        ),
      },
      {
        title: t('problems.colPass'),
        dataIndex: 'passStatus',
        key: 'passStatus',
        width: 120,
        render: (status: PassStatus) => passStatusTag(status, t),
      },
      {
        title: t('problems.colDifficulty'),
        dataIndex: 'difficulty',
        key: 'difficulty',
        width: 88,
        render: (d: number) => <Tag>{d}</Tag>,
      },
    ],
    [t],
  );

  return (
    <Card title={t('problems.title')}>
      <Table<ProblemRow>
        loading={isLoading}
        dataSource={data ?? []}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
}
