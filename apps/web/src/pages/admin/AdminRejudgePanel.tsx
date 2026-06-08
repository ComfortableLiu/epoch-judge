import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { appMessage } from '../../lib/app-message';
import {
  TERMINAL_SUBMISSION_STATUSES,
  submissionStatusColor,
} from '../../lib/submission-status-ui';
import { useTranslation } from 'react-i18next';

type RejudgeScope = 'problem' | 'submission' | 'contest';

type CandidateRow = {
  id: string;
  status: string;
  language: string;
  score: number | null;
  createdAt: string;
  problemId: string;
  contestId: string | null;
  problem: { number: number; title: string };
  user: { username: string; displayName: string | null };
};

type ProblemOption = { id: string; number: number; title: string };
type ContestOption = { id: string; number: number; title: string };

type PreviewResult = {
  eligibleCount: number;
  skipped: { submissionId: string; reason: string }[];
  sampleIds: string[];
};

type ExecuteResult = {
  queued: number;
  skipped: { submissionId: string; reason: string }[];
};

export function AdminRejudgePanel() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<RejudgeScope>('submission');
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<ExecuteResult | null>(null);

  const problems = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () => api<ProblemOption[]>('/problems?all=1'),
  });

  const contests = useQuery({
    queryKey: ['admin-contests'],
    queryFn: () => api<ContestOption[]>('/admin/contests'),
  });

  const requestBody = useMemo(
    () => ({
      scope,
      ids:
        scope === 'submission'
          ? selectedRowKeys
          : scopeIds,
      submissionIds:
        scope === 'problem' || scope === 'contest'
          ? selectedRowKeys.length
            ? selectedRowKeys
            : undefined
          : undefined,
      statuses: statusFilter.length ? statusFilter : undefined,
    }),
    [scope, scopeIds, selectedRowKeys, statusFilter],
  );

  const candidates = useQuery({
    queryKey: ['rejudge-candidates', scope, scopeIds, statusFilter],
    queryFn: () =>
      api<CandidateRow[]>('/admin/rejudge/candidates', {
        method: 'POST',
        body: JSON.stringify({
          scope,
          ids: scope === 'submission' ? [] : scopeIds,
          statuses: statusFilter.length ? statusFilter : undefined,
        }),
      }),
    enabled:
      scope === 'submission' ||
      (scope === 'problem' && scopeIds.length > 0) ||
      (scope === 'contest' && scopeIds.length > 0),
  });

  const preview = useMutation({
    mutationFn: () =>
      api<PreviewResult>('/admin/rejudge/preview', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    onSuccess: (data) => {
      appMessage.info(
        t('admin.rejudge.previewResult', {
          eligible: data.eligibleCount,
          skipped: data.skipped.length,
        }),
      );
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const execute = useMutation({
    mutationFn: () =>
      api<ExecuteResult>('/admin/rejudge', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    onSuccess: (data) => {
      setLastResult(data);
      appMessage.success(t('admin.rejudge.queued', { count: data.queued }));
      void candidates.refetch();
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const tableData = candidates.data ?? [];
  const canPreview =
    scope === 'submission'
      ? selectedRowKeys.length > 0
      : scopeIds.length > 0;

  const formatStatus = (status: string) =>
    t(`submissionStatus.${status}`, { defaultValue: status });

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Radio.Group
        value={scope}
        onChange={(e) => {
          setScope(e.target.value as RejudgeScope);
          setScopeIds([]);
          setSelectedRowKeys([]);
          setStatusFilter([]);
          setLastResult(null);
        }}
        optionType="button"
        options={[
          { label: t('admin.rejudge.scopeSubmission'), value: 'submission' },
          { label: t('admin.rejudge.scopeProblem'), value: 'problem' },
          { label: t('admin.rejudge.scopeContest'), value: 'contest' },
        ]}
      />

      {scope === 'problem' && (
        <Select
          mode="multiple"
          placeholder={t('admin.rejudge.selectProblem')}
          style={{ width: '100%', maxWidth: 560 }}
          loading={problems.isLoading}
          options={(problems.data ?? []).map((p) => ({
            value: p.id,
            label: `#${p.number} ${p.title}`,
          }))}
          value={scopeIds}
          onChange={(v) => {
            setScopeIds(v);
            setSelectedRowKeys([]);
          }}
        />
      )}

      {scope === 'contest' && (
        <Select
          mode="multiple"
          placeholder={t('admin.rejudge.selectContest')}
          style={{ width: '100%', maxWidth: 560 }}
          loading={contests.isLoading}
          options={(contests.data ?? []).map((c) => ({
            value: c.id,
            label: `#${c.number} ${c.title}`,
          }))}
          value={scopeIds}
          onChange={(v) => {
            setScopeIds(v);
            setSelectedRowKeys([]);
          }}
        />
      )}

      <Select
        mode="multiple"
        allowClear
        placeholder={t('admin.rejudge.statusFilter')}
        style={{ width: '100%', maxWidth: 560 }}
        value={statusFilter}
        onChange={(v) => {
          setStatusFilter(v);
          setSelectedRowKeys([]);
        }}
        options={TERMINAL_SUBMISSION_STATUSES.map((s) => ({
          value: s,
          label: formatStatus(s),
        }))}
        maxTagCount="responsive"
      />

      <Typography.Text type="secondary">
        {scope === 'submission'
          ? t('admin.rejudge.hintSubmission')
          : t('admin.rejudge.hintOther')}
      </Typography.Text>

      <Table<CandidateRow>
        loading={candidates.isLoading}
        dataSource={tableData}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: t('admin.rejudge.colId'),
            dataIndex: 'number',
            width: 120,
            render: (num: number) => (
              <Link to={`/submissions/${num}`}>#{num}</Link>
            ),
          },
          {
            title: t('admin.rejudge.colProblem'),
            render: (_, row) => (
              <Link to={`/problems/${row.problem.number}`}>{row.problem.title}</Link>
            ),
          },
          {
            title: t('admin.rejudge.colUser'),
            render: (_, row) =>
              row.user.displayName ?? row.user.username,
          },
          {
            title: t('admin.rejudge.colStatus'),
            dataIndex: 'status',
            render: (status: string) => (
              <Tag color={submissionStatusColor(status)}>
                {formatStatus(status)}
              </Tag>
            ),
          },
          { title: t('admin.rejudge.colLanguage'), dataIndex: 'language', width: 100 },
          { title: t('admin.rejudge.colScore'), dataIndex: 'score', width: 72 },
        ]}
      />

      <Space>
        <Button
          onClick={() => {
            const all = tableData.map((r) => r.id);
            setSelectedRowKeys(all);
          }}
          disabled={!tableData.length}
        >
          {t('admin.rejudge.selectAll')}
        </Button>
        <Button onClick={() => setSelectedRowKeys([])}>{t('admin.rejudge.clearAll')}</Button>
        <Button
          loading={preview.isPending}
          disabled={!canPreview}
          onClick={() => preview.mutate()}
        >
          {t('admin.rejudge.preview')}
        </Button>
        <Button
          type="primary"
          danger
          loading={execute.isPending}
          disabled={!canPreview}
          onClick={() => execute.mutate()}
        >
          {t('admin.rejudge.confirm')}
        </Button>
      </Space>

      {preview.data && (
        <Alert
          type="info"
          showIcon
          message={t('admin.rejudge.previewMessage', {
            eligible: preview.data.eligibleCount,
            skipped: preview.data.skipped.length,
          })}
        />
      )}

      {lastResult && (
        <Card size="small" title={t('admin.rejudge.lastResult')}>
          <p>{t('admin.rejudge.queuedCount', { count: lastResult.queued })}</p>
          <p>{t('admin.rejudge.skippedCount', { count: lastResult.skipped.length })}</p>
          {lastResult.skipped.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {lastResult.skipped.slice(0, 20).map((s) => (
                <li key={s.submissionId}>
                  {s.submissionId.slice(0, 8)}… — {s.reason}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </Space>
  );
}
