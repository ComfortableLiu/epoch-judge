import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';

type UserStats = {
  summary: {
    totalSubmissions: number;
    solvedCount: number;
    attemptedCount: number;
    passRatePercent: number;
  };
  verdictBreakdown: Record<string, number>;
  contests: {
    contestId: string;
    number: number;
    title: string;
    startAt: string;
    endAt: string;
    status: 'upcoming' | 'running' | 'ended';
    submissionCount: number;
    acceptedProblemCount: number;
  }[];
};

type SolvedProblemItem = {
  problemId: string;
  number: number;
  title: string;
  firstAcceptedAt: string;
  contestNumber: number | null;
};

type SolvedPage = {
  items: SolvedProblemItem[];
  total: number;
  page: number;
  pageSize: number;
};

function contestStatusTag(
  status: 'upcoming' | 'running' | 'ended',
  t: (key: string) => string,
) {
  if (status === 'running') {
    return <Tag color="success">{t('contests.statusRunning')}</Tag>;
  }
  if (status === 'upcoming') {
    return <Tag color="processing">{t('contests.statusUpcoming')}</Tag>;
  }
  return <Tag>{t('contests.statusEnded')}</Tag>;
}

export function ProfileStatsPanel() {
  const { t } = useTranslation();
  const [solvedPage, setSolvedPage] = useState(1);
  const [solvedPageSize, setSolvedPageSize] = useState(10);

  const stats = useQuery({
    queryKey: ['profile-stats'],
    queryFn: () => api<UserStats>('/users/me/stats'),
  });

  const solved = useQuery({
    queryKey: ['profile-solved', solvedPage, solvedPageSize],
    queryFn: () =>
      api<SolvedPage>(
        `/users/me/stats/solved-problems?page=${solvedPage}&pageSize=${solvedPageSize}`,
      ),
  });

  const verdictEntries = Object.entries(stats.data?.verdictBreakdown ?? {}).filter(
    ([, count]) => count > 0,
  );

  const contestColumns: ColumnsType<UserStats['contests'][number]> = [
    {
      title: t('profile.stats.colContest'),
      key: 'title',
      render: (_, row) => (
        <Link to={`/contests/${row.number}`}>
          {formatEntityId(row.number)} {row.title}
        </Link>
      ),
    },
    {
      title: t('profile.stats.colContestStatus'),
      dataIndex: 'status',
      width: 96,
      render: (s: 'upcoming' | 'running' | 'ended') => contestStatusTag(s, t),
    },
    {
      title: t('profile.stats.colSubmissions'),
      dataIndex: 'submissionCount',
      width: 88,
      align: 'center',
    },
    {
      title: t('profile.stats.colContestSolved'),
      dataIndex: 'acceptedProblemCount',
      width: 88,
      align: 'center',
    },
    {
      title: t('profile.stats.colContestTime'),
      key: 'time',
      width: 200,
      render: (_, row) => (
        <span style={{ fontSize: 12 }}>
          {new Date(row.startAt).toLocaleDateString()} —{' '}
          {new Date(row.endAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const solvedColumns: ColumnsType<SolvedProblemItem> = [
    {
      title: t('problems.colId'),
      dataIndex: 'number',
      width: 72,
      render: (n: number) => (
        <Link to={`/problems/${n}`}>{formatEntityId(n)}</Link>
      ),
    },
    {
      title: t('problems.colTitle'),
      key: 'title',
      render: (_, row) => <Link to={`/problems/${row.number}`}>{row.title}</Link>,
    },
    {
      title: t('profile.stats.colFirstAc'),
      dataIndex: 'firstAcceptedAt',
      width: 168,
      render: (v: string) => (
        <span style={{ fontSize: 12 }}>{new Date(v).toLocaleString()}</span>
      ),
    },
    {
      title: t('profile.stats.colContext'),
      dataIndex: 'contestNumber',
      width: 100,
      render: (n: number | null) =>
        n != null ? (
          <Tag color="blue">
            {t('profile.stats.contestTag')} #{n}
          </Tag>
        ) : (
          <Tag>{t('profile.stats.practiceTag')}</Tag>
        ),
    },
  ];

  return (
    <div>
      <Typography.Paragraph type="secondary">
        {t('profile.stats.hint')}
      </Typography.Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card loading={stats.isLoading}>
            <Statistic
              title={t('profile.stats.totalSubmissions')}
              value={stats.data?.summary.totalSubmissions ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={stats.isLoading}>
            <Statistic
              title={t('profile.stats.solvedCount')}
              value={stats.data?.summary.solvedCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={stats.isLoading}>
            <Statistic
              title={t('profile.stats.attemptedCount')}
              value={stats.data?.summary.attemptedCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={stats.isLoading}>
            <Statistic
              title={t('profile.stats.passRate')}
              value={stats.data?.summary.passRatePercent ?? 0}
              suffix="%"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {verdictEntries.length > 0 && (
        <Card
          title={t('profile.stats.verdictTitle')}
          style={{ marginBottom: 16 }}
          loading={stats.isLoading}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {verdictEntries.map(([status, count]) => (
              <Tag key={status}>
                {t(`submissionStatus.${status}`, { defaultValue: status })}: {count}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      <Card
        title={t('profile.stats.solvedTitle')}
        style={{ marginBottom: 16 }}
        loading={solved.isLoading}
      >
        <Table<SolvedProblemItem>
          rowKey="problemId"
          dataSource={solved.data?.items ?? []}
          columns={solvedColumns}
          pagination={{
            current: solvedPage,
            pageSize: solvedPageSize,
            total: solved.data?.total ?? 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setSolvedPage(p);
              setSolvedPageSize(ps);
            },
          }}
        />
      </Card>

      <Card title={t('profile.stats.contestsTitle')} loading={stats.isLoading}>
        <Table
          rowKey="contestId"
          dataSource={stats.data?.contests ?? []}
          columns={contestColumns}
          pagination={false}
          locale={{ emptyText: t('profile.stats.noContests') }}
        />
      </Card>
    </div>
  );
}
