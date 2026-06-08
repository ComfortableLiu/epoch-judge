import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getToken, isTokenUsable } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';
import {
  hasPendingSubmissions,
  submissionStatusColor,
} from '../lib/submission-status-ui';
import { SubmissionListSkeleton } from '../components/skeleton';

type SubmissionRow = {
  number: number;
  status: string;
  language: string;
  score: number | null;
  createdAt: string;
  problem: { number: number; title: string };
  user: { username: string; displayName: string | null };
};

type PaginatedResponse = {
  data: SubmissionRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const POLL_MS = 2000;

export function SubmissionsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isPending } = useQuery({
    queryKey: ['submissions', page, limit],
    queryFn: () => api<PaginatedResponse>(`/submissions?page=${page}&limit=${limit}`),
    enabled: isTokenUsable(getToken()),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      hasPendingSubmissions(query.state.data?.data) ? POLL_MS : false,
    refetchIntervalInBackground: true,
  });

  const columns: ColumnsType<SubmissionRow> = useMemo(
    () => [
      {
        title: t('submissions.colId'),
        dataIndex: 'number',
        key: 'number',
        width: 120,
        render: (number: number) => (
          <Link to={`/submissions/${number}`}>
            {formatEntityId(number)}
          </Link>
        ),
      },
      {
        title: t('submissions.colProblem'),
        key: 'problem',
        render: (_, row) => (
          <Link to={`/problems/${row.problem.number}`}>
            {formatEntityId(row.problem.number)} {row.problem.title}
          </Link>
        ),
      },
      {
        title: t('submissions.colUser'),
        key: 'user',
        width: 120,
        render: (_, row) => row.user.displayName ?? row.user.username,
      },
      {
        title: t('submissions.colStatus'),
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (status: string) => (
          <Tag color={submissionStatusColor(status)}>
            {t(`submissionStatus.${status}`, { defaultValue: status })}
          </Tag>
        ),
      },
      {
        title: t('submissions.colLanguage'),
        dataIndex: 'language',
        key: 'language',
        width: 120,
      },
      {
        title: t('submissions.colScore'),
        dataIndex: 'score',
        key: 'score',
        width: 80,
        align: 'right',
        render: (score: number | null) =>
          score != null ? score : <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: t('submissions.colTime'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (createdAt: string) => new Date(createdAt).toLocaleString(),
      },
    ],
    [t],
  );

  if (isPending && !data) {
    return <SubmissionListSkeleton />;
  }

  return (
    <Card title={t('submissions.title')}>
      <Table<SubmissionRow>
        rowKey="number"
        columns={columns}
        dataSource={data?.data ?? []}
        pagination={{
          current: data?.pagination.page ?? page,
          pageSize: data?.pagination.limit ?? limit,
          total: data?.pagination.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (newPage, newLimit) => {
            setPage(newPage);
            setLimit(newLimit);
          },
          showTotal: (total, range) =>
            t('submissions.paginationTotal', {
              defaultValue: `${range[0]}-${range[1]} of ${total}`,
              start: range[0],
              end: range[1],
              total,
            }),
        }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </Card>
  );
}
