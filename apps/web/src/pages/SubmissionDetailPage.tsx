import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, List, Progress, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getToken } from '../api/client';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';
import {
  isSubmissionTerminal,
  submissionStatusColor,
} from '../lib/submission-status-ui';

export function SubmissionDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [live, setLive] = useState<string[]>([]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () =>
      api<{
        status: string;
        score: number | null;
        testcaseResults: { verdict: string; testcaseId: string }[];
      }>(`/submissions/${id}`),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data && !isSubmissionTerminal(q.state.data.status) ? 2000 : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    const es = new EventSource(`/api/v1/submissions/${id}/stream`, {
      withCredentials: false,
    });
    // EventSource cannot set Authorization; rely on cookie-less dev or poll
    void token;
    es.onmessage = (ev) => {
      setLive((prev) => [...prev, ev.data]);
      void refetch();
    };
    return () => es.close();
  }, [id, refetch]);

  const submissionLabel = id
    ? id.length > 8
      ? `${id.slice(0, 8)}…`
      : id
    : undefined;
  useBreadcrumbLabel(submissionLabel);

  const judging = data && !isSubmissionTerminal(data.status);

  return (
    <Card title={`Submission ${id?.slice(0, 8)}`} loading={isLoading}>
      {judging && <Progress percent={99} status="active" />}
      {data?.status && (
        <Tag color={submissionStatusColor(data.status)}>{data.status}</Tag>
      )}
      {data?.score != null && <Tag>Score: {data.score}</Tag>}
      {judging && (
        <Typography.Text type="secondary">{t('submissions.streaming')}</Typography.Text>
      )}
      <List
        style={{ marginTop: 16 }}
        dataSource={data?.testcaseResults ?? []}
        renderItem={(r) => (
          <List.Item>
            <Tag>{r.verdict}</Tag>
            <span>{r.testcaseId.slice(0, 8)}</span>
          </List.Item>
        )}
      />
      {live.length > 0 && (
        <pre style={{ fontSize: 11, marginTop: 16, maxHeight: 120, overflow: 'auto' }}>
          {live.slice(-5).join('\n')}
        </pre>
      )}
    </Card>
  );
}
