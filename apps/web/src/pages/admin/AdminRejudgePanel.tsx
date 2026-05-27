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
        `可重判 ${data.eligibleCount} 条，跳过 ${data.skipped.length} 条`,
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
      appMessage.success(`已入队 ${data.queued} 条`);
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
          { label: '按提交', value: 'submission' },
          { label: '按题目', value: 'problem' },
          { label: '按比赛', value: 'contest' },
        ]}
      />

      {scope === 'problem' && (
        <Select
          mode="multiple"
          placeholder="选择题目"
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
          placeholder="选择比赛"
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
        placeholder="按状态筛选（不选则显示全部终态）"
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
          ? '可先按状态缩小列表，再勾选提交记录后预览或确认重判。'
          : '先选题目/比赛，可用状态进一步筛选，再在表格中勾选要重判的提交。'}
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
            title: 'ID',
            dataIndex: 'number',
            width: 120,
            render: (num: number) => (
              <Link to={`/submissions/${num}`}>#{num}</Link>
            ),
          },
          {
            title: '题目',
            render: (_, row) => (
              <Link to={`/problems/${row.problem.number}`}>{row.problem.title}</Link>
            ),
          },
          {
            title: '用户',
            render: (_, row) =>
              row.user.displayName ?? row.user.username,
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (status: string) => (
              <Tag color={submissionStatusColor(status)}>
                {formatStatus(status)}
              </Tag>
            ),
          },
          { title: '语言', dataIndex: 'language', width: 100 },
          { title: '分数', dataIndex: 'score', width: 72 },
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
          全选
        </Button>
        <Button onClick={() => setSelectedRowKeys([])}>清空</Button>
        <Button
          loading={preview.isPending}
          disabled={!canPreview}
          onClick={() => preview.mutate()}
        >
          预览影响条数
        </Button>
        <Button
          type="primary"
          danger
          loading={execute.isPending}
          disabled={!canPreview}
          onClick={() => execute.mutate()}
        >
          确认重判
        </Button>
      </Space>

      {preview.data && (
        <Alert
          type="info"
          showIcon
          message={`预览：${preview.data.eligibleCount} 条可重判，${preview.data.skipped.length} 条将跳过`}
        />
      )}

      {lastResult && (
        <Card size="small" title="最近一批结果">
          <p>成功入队：{lastResult.queued}</p>
          <p>跳过/失败：{lastResult.skipped.length}</p>
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
