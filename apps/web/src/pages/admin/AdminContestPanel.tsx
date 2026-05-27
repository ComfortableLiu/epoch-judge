import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { appMessage } from '../../lib/app-message';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { AdminContestRegistrationsModal } from './AdminContestRegistrationsModal';

type ContestRow = {
  id: string;
  number: number;
  title: string;
  visibility: string;
  judgeMode: string;
  startAt: string;
  endAt: string;
  freezeAt: string | null;
  _count: { problems: number; registrations: number; submissions: number };
};

type ContestDetail = {
  id: string;
  number: number;
  title: string;
  description: string;
  visibility: string;
  judgeMode: string;
  startAt: string;
  endAt: string;
  freezeAt: string | null;
  accessPassword: string | null;
  problemIds: string[];
};

type ProblemOption = { id: string; number: number; title: string };

type DurationUnit = 'minute' | 'hour';

function truncateMinute(d: Dayjs): Dayjs {
  return d.second(0).millisecond(0);
}

function durationBetween(start: Dayjs, end: Dayjs): { value: number; unit: DurationUnit } {
  const minutes = Math.max(0, end.diff(start, 'minute'));
  if (minutes > 0 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'hour' };
  }
  return { value: minutes || 180, unit: minutes >= 60 ? 'hour' : 'minute' };
}

function addDuration(start: Dayjs, value: number, unit: DurationUnit): Dayjs {
  return truncateMinute(start.add(value, unit));
}

function freezeOffsetFromEnd(
  end: Dayjs,
  freeze: Dayjs | null,
): { value: number; unit: DurationUnit } | null {
  if (!freeze) return null;
  const minutes = end.diff(freeze, 'minute');
  if (minutes <= 0) return { value: 30, unit: 'minute' };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 'hour' };
  return { value: minutes, unit: 'minute' };
}

function freezeFromOffset(
  end: Dayjs,
  value: number | null,
  unit: DurationUnit,
): Dayjs | null {
  if (value == null || value <= 0) return null;
  return truncateMinute(end.subtract(value, unit));
}

export function AdminContestPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContestRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [judgeMode, setJudgeMode] = useState('ACM');
  const [accessPassword, setAccessPassword] = useState('');
  const [startAt, setStartAt] = useState<Dayjs>(() => truncateMinute(dayjs()));
  const [endAt, setEndAt] = useState<Dayjs>(() =>
    truncateMinute(dayjs().add(3, 'hour')),
  );
  const [durationValue, setDurationValue] = useState(3);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('hour');
  const [freezeValue, setFreezeValue] = useState<number | null>(null);
  const [freezeUnit, setFreezeUnit] = useState<DurationUnit>('minute');
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [addProblemId, setAddProblemId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [regContest, setRegContest] = useState<ContestRow | null>(null);

  const contests = useQuery({
    queryKey: ['admin-contests'],
    queryFn: () => api<ContestRow[]>('/admin/contests'),
  });

  const problems = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () => api<ProblemOption[]>('/problems?all=1'),
  });

  const problemMap = new Map((problems.data ?? []).map((p) => [p.id, p]));

  const syncDurationFromEnd = useCallback((start: Dayjs, end: Dayjs) => {
    const d = durationBetween(start, end);
    setDurationValue(d.value);
    setDurationUnit(d.unit);
  }, []);

  const setEndFromDuration = useCallback(
    (start: Dayjs, value: number, unit: DurationUnit) => {
      const end = addDuration(start, value, unit);
      setEndAt(end);
      setDurationValue(value);
      setDurationUnit(unit);
    },
    [],
  );

  const saveContest = useMutation({
    mutationFn: async () => {
      const freezeAt = freezeFromOffset(endAt, freezeValue, freezeUnit);
      const body = {
        title,
        description,
        visibility,
        judgeMode,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        freezeAt: freezeAt?.toISOString() ?? null,
        accessPassword: accessPassword.trim() || null,
        problemIds,
      };
      if (editing) {
        return api(`/admin/contests/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      return api('/admin/contests', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      appMessage.success(editing ? '比赛已更新' : '比赛已创建');
      setOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['admin-contests'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const deleteContest = useMutation({
    mutationFn: (id: string) => api(`/admin/contests/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      appMessage.success('比赛已删除');
      void qc.invalidateQueries({ queryKey: ['admin-contests'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const resetForm = () => {
    const now = truncateMinute(dayjs());
    setTitle('');
    setDescription('');
    setVisibility('PUBLIC');
    setJudgeMode('ACM');
    setAccessPassword('');
    setStartAt(now);
    setEndFromDuration(now, 3, 'hour');
    setFreezeValue(null);
    setFreezeUnit('minute');
    setProblemIds([]);
    setAddProblemId(null);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = async (row: ContestRow) => {
    setEditing(row);
    setLoadingDetail(true);
    setOpen(true);
    try {
      const detail = await api<ContestDetail>(`/admin/contests/${row.id}`);
      const start = truncateMinute(dayjs(detail.startAt));
      const end = truncateMinute(dayjs(detail.endAt));
      setTitle(detail.title);
      setDescription(detail.description);
      setVisibility(detail.visibility);
      setJudgeMode(detail.judgeMode);
      setAccessPassword(detail.accessPassword ?? '');
      setStartAt(start);
      setEndAt(end);
      syncDurationFromEnd(start, end);
      const fo = freezeOffsetFromEnd(end, detail.freezeAt ? dayjs(detail.freezeAt) : null);
      setFreezeValue(fo?.value ?? null);
      setFreezeUnit(fo?.unit ?? 'minute');
      setProblemIds(detail.problemIds);
    } catch (e) {
      appMessage.error(e instanceof Error ? e.message : '加载失败');
      setOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const onStartChange = (d: Dayjs | null) => {
    if (!d) return;
    const start = truncateMinute(d);
    setStartAt(start);
    setEndFromDuration(start, durationValue, durationUnit);
  };

  const onEndPickerChange = (d: Dayjs | null) => {
    if (!d) return;
    const end = truncateMinute(d);
    if (end.isBefore(startAt)) {
      appMessage.warning('结束时间不能早于开始时间');
      return;
    }
    setEndAt(end);
    syncDurationFromEnd(startAt, end);
  };

  const onDurationChange = (value: number | null, unit?: DurationUnit) => {
    const v = value ?? durationValue;
    const u = unit ?? durationUnit;
    setEndFromDuration(startAt, v, u);
  };

  const moveProblem = (from: number, to: number) => {
    if (to < 0 || to >= problemIds.length) return;
    const next = [...problemIds];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProblemIds(next);
  };

  return (
    <>
      <Button type="primary" style={{ marginBottom: 12 }} onClick={openCreate}>
        新建比赛
      </Button>

      <Table<ContestRow>
        loading={contests.isLoading}
        dataSource={contests.data ?? []}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: 'ID',
            dataIndex: 'number',
            width: 72,
            render: (n: number) => (
              <Link to={`/contests/${n}`} target="_blank" rel="noreferrer">
                #{n}
              </Link>
            ),
          },
          { title: '标题', dataIndex: 'title' },
          {
            title: '模式',
            dataIndex: 'judgeMode',
            width: 72,
            render: (m: string) => <Tag>{m}</Tag>,
          },
          { title: '可见性', dataIndex: 'visibility', width: 88 },
          {
            title: '时间',
            key: 'time',
            render: (_, row) => (
              <span style={{ fontSize: 12 }}>
                {new Date(row.startAt).toLocaleString()} —{' '}
                {new Date(row.endAt).toLocaleString()}
              </span>
            ),
          },
          {
            title: '题目',
            key: 'problems',
            width: 64,
            render: (_, row) => row._count.problems,
          },
          {
            title: '操作',
            key: 'actions',
            width: 200,
            render: (_, row) => (
              <Space>
                <Button type="link" size="small" onClick={() => void openEdit(row)}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={() => setRegContest(row)}>
                  报名/打星
                </Button>
                <Popconfirm
                  title="确定删除该比赛？"
                  disabled={row._count.submissions > 0}
                  onConfirm={() => deleteContest.mutate(row.id)}
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    disabled={row._count.submissions > 0}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `编辑比赛 #${editing.number}` : '新建比赛'}
        open={open}
        width={760}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={saveContest.isPending || loadingDetail}
              disabled={!title.trim() || loadingDetail}
              onClick={() => saveContest.mutate()}
            >
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text type="secondary">标题</Typography.Text>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Typography.Text type="secondary">说明</Typography.Text>
            <Input.TextArea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Space wrap>
            <div>
              <Typography.Text type="secondary">可见性</Typography.Text>
              <Select
                style={{ width: 120, display: 'block' }}
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'PUBLIC', label: 'PUBLIC' },
                  { value: 'PRIVATE', label: 'PRIVATE' },
                ]}
              />
            </div>
            <div>
              <Typography.Text type="secondary">评测模式</Typography.Text>
              <Select
                style={{ width: 120, display: 'block' }}
                value={judgeMode}
                onChange={setJudgeMode}
                options={[
                  { value: 'ACM', label: 'ACM' },
                  { value: 'OI', label: 'OI' },
                ]}
              />
            </div>
          </Space>
          <div>
            <Typography.Text type="secondary">开始时间（精确到分钟）</Typography.Text>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={startAt}
              onChange={onStartChange}
              disabled={loadingDetail}
            />
          </div>
          <div>
            <Typography.Text type="secondary">结束时间</Typography.Text>
            <Space wrap style={{ marginTop: 8 }}>
              <span>开始后</span>
              <InputNumber
                min={1}
                value={durationValue}
                onChange={(v) => onDurationChange(v)}
                disabled={loadingDetail}
              />
              <Select
                value={durationUnit}
                style={{ width: 88 }}
                onChange={(u: DurationUnit) => onDurationChange(durationValue, u)}
                options={[
                  { value: 'minute', label: '分钟' },
                  { value: 'hour', label: '小时' },
                ]}
                disabled={loadingDetail}
              />
              <span>或指定时刻</span>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                value={endAt}
                onChange={onEndPickerChange}
                disabled={loadingDetail}
              />
            </Space>
          </div>
          <div>
            <Typography.Text type="secondary">封榜（距结束，可选）</Typography.Text>
            <Space wrap style={{ marginTop: 8 }}>
              <InputNumber
                min={1}
                placeholder="不封榜"
                value={freezeValue ?? undefined}
                onChange={(v) => setFreezeValue(v ?? null)}
                disabled={loadingDetail}
              />
              <Select
                value={freezeUnit}
                style={{ width: 88 }}
                onChange={(u: DurationUnit) => setFreezeUnit(u)}
                options={[
                  { value: 'minute', label: '分钟' },
                  { value: 'hour', label: '小时' },
                ]}
                disabled={loadingDetail}
              />
              <span>前</span>
            </Space>
          </div>
          <div>
            <Typography.Text type="secondary">
              比赛密码（明文存储，留空表示无密码）
            </Typography.Text>
            <Input.Password
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              placeholder="可选"
              autoComplete="new-password"
              disabled={loadingDetail}
            />
          </div>
          <div>
            <Typography.Text type="secondary">
              比赛题目（拖拽排序，顺序对应 A/B/C…）
            </Typography.Text>
            <List
              style={{ marginTop: 8 }}
              bordered
              dataSource={problemIds}
              locale={{ emptyText: '暂无题目，请下方添加' }}
              renderItem={(pid, index) => {
                const p = problemMap.get(pid);
                return (
                  <List.Item
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex != null) moveProblem(dragIndex, index);
                      setDragIndex(null);
                    }}
                    actions={[
                      <Button
                        key="up"
                        type="link"
                        size="small"
                        disabled={index === 0}
                        onClick={() => moveProblem(index, index - 1)}
                      >
                        上移
                      </Button>,
                      <Button
                        key="down"
                        type="link"
                        size="small"
                        disabled={index === problemIds.length - 1}
                        onClick={() => moveProblem(index, index + 1)}
                      >
                        下移
                      </Button>,
                      <Button
                        key="del"
                        type="link"
                        size="small"
                        danger
                        onClick={() =>
                          setProblemIds(problemIds.filter((id) => id !== pid))
                        }
                      >
                        移除
                      </Button>,
                    ]}
                  >
                    <Tag>{String.fromCharCode(65 + Math.min(index, 25))}</Tag>
                    {p ? (
                      <>
                        {p.title}{' '}
                        <Typography.Text type="secondary">
                          (#{p?.number ?? '?'})
                        </Typography.Text>
                      </>
                    ) : (
                      pid
                    )}
                  </List.Item>
                );
              }}
            />
            <Space style={{ marginTop: 8 }}>
              <Select
                style={{ minWidth: 280 }}
                placeholder="选择题目添加"
                value={addProblemId}
                onChange={setAddProblemId}
                loading={problems.isLoading}
                optionFilterProp="label"
                options={(problems.data ?? [])
                  .filter((p) => !problemIds.includes(p.id))
                  .map((p) => ({
                    value: p.id,
                    label: `#${p.number} ${p.title}`,
                  }))}
                disabled={loadingDetail}
              />
              <Button
                onClick={() => {
                  if (addProblemId) {
                    setProblemIds([...problemIds, addProblemId]);
                    setAddProblemId(null);
                  }
                }}
                disabled={!addProblemId || loadingDetail}
              >
                添加
              </Button>
            </Space>
          </div>
        </Space>
      </Modal>

      {regContest && (
        <AdminContestRegistrationsModal
          contestId={regContest.id}
          contestTitle={regContest.title}
          open
          onClose={() => setRegContest(null)}
        />
      )}
    </>
  );
}
