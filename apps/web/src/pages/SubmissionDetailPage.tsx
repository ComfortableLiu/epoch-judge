import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Result, Spin, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';
import { CodeEditor } from '../components/CodeEditor';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';
import { formatMemoryKiB } from '../lib/format-memory';
import {
  formatOiScore,
  maxRuntimeStats,
} from '../lib/submission-detail-stats';
import {
  isSubmissionTerminal,
  submissionStatusColor,
} from '../lib/submission-status-ui';

type SubmissionDetail = {
  number: number;
  status: string;
  score: number | null;
  maxTimeMs: number;
  maxMemoryKb: number;
  judgeMode: string;
  language: string;
  isOwn: boolean;
  sourceCode?: string;
  problem: { number: number; title: string };
  testcaseResults: {
    verdict: string;
    timeMs: number | null;
    memoryKb: number | null;
    testcase: { isSample: boolean };
  }[];
};

function RuntimeStats({
  maxTimeMs,
  maxMemoryKb,
  t,
}: {
  maxTimeMs: number;
  maxMemoryKb: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
      <Descriptions.Item label={t('submissions.maxTime')}>
        {maxTimeMs > 0 ? `${maxTimeMs} ms` : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('submissions.maxMemory')}>
        {formatMemoryKiB(maxMemoryKb)}
      </Descriptions.Item>
    </Descriptions>
  );
}

export function SubmissionDetailPage() {
  const { number } = useParams();
  const { t } = useTranslation();

  const { data, isPending } = useQuery({
    queryKey: ['submission', number],
    queryFn: () => api<SubmissionDetail>(`/submissions/${number}`),
    enabled: Boolean(number),
    refetchInterval: (q) =>
      q.state.data && !isSubmissionTerminal(q.state.data.status) ? 1500 : false,
    refetchIntervalInBackground: true,
  });

  const submissionLabel =
    data?.number != null
      ? formatEntityId(data.number)
      : number
        ? `#${number}`
        : undefined;
  useBreadcrumbLabel(submissionLabel);

  const judging = data && !isSubmissionTerminal(data.status);
  const statusLabel = data
    ? t(`submissionStatus.${data.status}`, { defaultValue: data.status })
    : '';

  const runtime = useMemo(() => {
    if (!data) return { maxTimeMs: 0, maxMemoryKb: 0 };
    return {
      maxTimeMs: data.maxTimeMs ?? maxRuntimeStats(data.testcaseResults).maxTimeMs,
      maxMemoryKb:
        data.maxMemoryKb ?? maxRuntimeStats(data.testcaseResults).maxMemoryKb,
    };
  }, [data]);

  const oiScoreLabel = useMemo(
    () => (data?.judgeMode === 'OI' ? formatOiScore(data.testcaseResults) : null),
    [data],
  );

  const resultStatus = useMemo(() => {
    if (!data || judging) return undefined;
    if (data.status === 'ACCEPTED') return 'success' as const;
    if (
      data.status === 'WRONG_ANSWER' ||
      data.status === 'TIME_LIMIT_EXCEEDED' ||
      data.status === 'MEMORY_LIMIT_EXCEEDED' ||
      data.status === 'RUNTIME_ERROR' ||
      data.status === 'COMPILE_ERROR'
    ) {
      return 'warning' as const;
    }
    return 'error' as const;
  }, [data, judging]);

  return (
    <Card
      title={
        data?.problem ? (
          <Link to={`/problems/${data.problem.number}`}>
            {formatEntityId(data.problem.number)} {data.problem.title}
          </Link>
        ) : (
          number
            ? formatEntityId(Number(number))
            : t('submissions.detailTitle')
        )
      }
    >
      {((isPending && !data) || judging) && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin size="large" />
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            {t('submissions.judging')}
          </Typography.Paragraph>
          {data && (
            <div style={{ textAlign: 'left', maxWidth: 320, margin: '16px auto 0' }}>
              <Tag color={submissionStatusColor(data.status)}>{statusLabel}</Tag>
              <RuntimeStats
                maxTimeMs={runtime.maxTimeMs}
                maxMemoryKb={runtime.maxMemoryKb}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      {!judging && data && resultStatus && (
        <Result
          status={resultStatus}
          title={statusLabel}
          subTitle={
            <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
              <Tag>{data.language}</Tag>
              <Tag color={submissionStatusColor(data.status)}>{data.judgeMode}</Tag>
              {data.judgeMode === 'OI' && oiScoreLabel && (
                <Typography.Title level={4} style={{ marginTop: 16, marginBottom: 0 }}>
                  {oiScoreLabel}
                </Typography.Title>
              )}
              <RuntimeStats
                maxTimeMs={runtime.maxTimeMs}
                maxMemoryKb={runtime.maxMemoryKb}
                t={t}
              />
            </div>
          }
        />
      )}

      {data?.isOwn && data.sourceCode && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            {t('submissions.yourCode')}
          </Typography.Title>
          <CodeEditor
            language={data.language}
            value={data.sourceCode}
            readOnly
          />
        </div>
      )}
    </Card>
  );
}
