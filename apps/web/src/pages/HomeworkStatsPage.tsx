import { useQuery } from '@tanstack/react-query';
import { Card, Col, Descriptions, Row, Space, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

interface HomeworkStats {
  homeworkId: string;
  title: string;
  deadline: string;
  className: string;
  totalProblems: number;
  totalMembers: number;
  totalSubmissions: number;
  avgCompletionRate: number;
  notSubmittedCount: number;
  notSubmitted: { userId: string; username: string; displayName: string | null }[];
  students: {
    userId: string;
    username: string;
    displayName: string | null;
    completedProblems: number;
    totalProblems: number;
    completionRate: number;
  }[];
  problems: { id: string; number: number; title: string }[];
}

export function HomeworkStatsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['homework', id, 'stats'],
    queryFn: () => api<HomeworkStats>(`/homework/${id}/stats`),
    enabled: !!id,
  });

  const studentColumns: ColumnsType<HomeworkStats['students'][0]> = useMemo(
    () => [
      {
        title: t('homework.student'),
        key: 'student',
        render: (_, row) => row.displayName || row.username,
      },
      {
        title: t('homework.completed'),
        key: 'completed',
        width: 120,
        render: (_, row) => `${row.completedProblems}/${row.totalProblems}`,
      },
      {
        title: t('homework.completionRate'),
        key: 'rate',
        width: 120,
        render: (_, row) => (
          <Tag color={row.completionRate >= 80 ? 'success' : row.completionRate >= 50 ? 'warning' : 'error'}>
            {row.completionRate}%
          </Tag>
        ),
      },
    ],
    [t],
  );

  if (!data) return null;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={t('homework.statsTitle', { title: data.title })} loading={isLoading}>
        <Row gutter={[24, 24]}>
          <Col span={6}>
            <Statistic title={t('homework.totalMembers')} value={data.totalMembers} />
          </Col>
          <Col span={6}>
            <Statistic title={t('homework.totalProblems')} value={data.totalProblems} />
          </Col>
          <Col span={6}>
            <Statistic title={t('homework.avgCompletion')} value={data.avgCompletionRate} suffix="%" />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('homework.notSubmitted')}
              value={data.notSubmittedCount}
              valueStyle={data.notSubmittedCount > 0 ? { color: '#ff4d4f' } : undefined}
            />
          </Col>
        </Row>

        <Descriptions column={2} style={{ marginTop: 24 }}>
          <Descriptions.Item label={t('classes.colName')}>{data.className}</Descriptions.Item>
          <Descriptions.Item label={t('homework.deadline')}>{new Date(data.deadline).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('homework.selectProblems')}>
        <Table
          dataSource={data.problems}
          rowKey="id"
          columns={[
            { title: 'ID', dataIndex: 'number', key: 'number', width: 80 },
            { title: t('homework.colTitle'), dataIndex: 'title', key: 'title' },
          ]}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title={`${t('homework.student')} (${data.totalMembers})`}>
        <Table
          dataSource={data.students}
          rowKey="userId"
          columns={studentColumns}
          pagination={false}
          size="small"
        />
      </Card>

      {data.notSubmitted.length > 0 && (
        <Card title={`${t('homework.notSubmitted')} (${data.notSubmittedCount})`}>
          <Table
            dataSource={data.notSubmitted}
            rowKey="userId"
            columns={[
              { title: t('classes.colUsername'), dataIndex: 'username', key: 'username' },
              { title: t('classes.colDisplayName'), dataIndex: 'displayName', key: 'displayName', render: (v: string | null) => v || '—' },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </Space>
  );
}
