import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Progress,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, decodeTokenPayload, getToken } from '../api/client';

interface HomeworkRow {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  className: string;
  classId: string;
  problemCount?: number;
  totalProblems?: number;
  completedProblems?: number;
  problems?: { id: string; number: number; title: string; completed?: boolean }[];
}

interface ClassOption {
  id: string;
  name: string;
}

interface ProblemOption {
  id: string;
  number: number;
  title: string;
}

interface MyClassesResponse {
  taught: ClassOption[];
  joined: ClassOption[];
}

export function HomeworkListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const classIdFilter = searchParams.get('classId') ?? undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const token = getToken();
  const payload = token ? decodeTokenPayload(token) : null;
  const isTeacher = payload?.role === 'ADMIN' || payload?.role === 'PROBLEM_EDITOR';

  const { data, isLoading } = useQuery({
    queryKey: ['homework', classIdFilter],
    queryFn: () => api<HomeworkRow[]>(`/homework${classIdFilter ? `?classId=${classIdFilter}` : ''}`),
    placeholderData: keepPreviousData,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes', 'my'],
    queryFn: () => api<MyClassesResponse>('/classes/my'),
    enabled: isTeacher,
  });

  const { data: problemsData } = useQuery({
    queryKey: ['problems', 'list'],
    queryFn: () => api<ProblemOption[]>('/problems'),
    enabled: createOpen,
  });

  const createMut = useMutation({
    mutationFn: (values: { classId: string; title: string; description?: string; deadline: string; problemIds: string[] }) =>
      api('/homework', { method: 'POST', body: JSON.stringify(values), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      message.success(t('homework.createSuccess'));
      setCreateOpen(false);
      createForm.resetFields();
      qc.invalidateQueries({ queryKey: ['homework'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const columns: ColumnsType<HomeworkRow> = useMemo(
    () => [
      { title: t('homework.colTitle'), dataIndex: 'title', key: 'title' },
      { title: t('homework.colClass'), dataIndex: 'className', key: 'className', width: 120 },
      {
        title: t('homework.colDeadline'),
        dataIndex: 'deadline',
        key: 'deadline',
        width: 180,
        render: (v: string) => {
          const isOverdue = new Date(v) < new Date();
          return (
            <span style={isOverdue ? { color: '#ff4d4f' } : undefined}>
              {new Date(v).toLocaleString()}
              {isOverdue && <Tag color="error" style={{ marginLeft: 8 }}>{t('homework.overdue')}</Tag>}
            </span>
          );
        },
      },
      ...(isTeacher
        ? [
            {
              title: t('homework.colProblems'),
              dataIndex: 'problemCount',
              key: 'problems',
              width: 80,
            } as const,
          ]
        : [
            {
              title: t('homework.colProgress'),
              key: 'progress',
              width: 160,
              render: (_: unknown, row: HomeworkRow) => {
                const total = row.totalProblems ?? row.problemCount ?? 0;
                const done = row.completedProblems ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <Space>
                    <Progress percent={pct} size="small" style={{ width: 80 }} />
                    <span>{done}/{total}</span>
                  </Space>
                );
              },
            } as const,
          ]),
      {
        title: t('classes.colActions'),
        key: 'actions',
        width: 100,
        render: (_, row) =>
          isTeacher ? (
            <Button size="small" onClick={() => nav(`/homework/${row.id}/stats`)}>
              {t('homework.viewStats')}
            </Button>
          ) : null,
      },
    ],
    [t, isTeacher, nav],
  );

  return (
    <>
      <Card
        title={t('homework.title')}
        extra={
          isTeacher && (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              {t('homework.create')}
            </Button>
          )
        }
      >
        <Table<HomeworkRow>
          dataSource={data ?? []}
          rowKey="id"
          columns={columns}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: t('homework.noHomework') }}
        />
      </Card>

      <Modal
        title={t('homework.createTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMut.isPending}
        width={640}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(v) =>
            createMut.mutate({
              ...v,
              deadline: v.deadline.toISOString(),
            })
          }
        >
          <Form.Item name="classId" label={t('homework.selectClass')} rules={[{ required: true, message: t('homework.selectClassRequired') }]}>
            <Select placeholder={t('homework.selectClass')}>
              {(classesData?.taught ?? []).map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label={t('homework.homeworkTitle')} rules={[{ required: true, message: t('homework.homeworkTitleRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('homework.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="deadline" label={t('homework.deadline')} rules={[{ required: true, message: t('homework.deadlineRequired') }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="problemIds" label={t('homework.selectProblems')} rules={[{ required: true, message: t('homework.selectProblemsRequired') }]}>
            <Select
              mode="multiple"
              placeholder={t('homework.selectProblems')}
              optionFilterProp="label"
              options={(problemsData ?? []).map((p) => ({
                value: p.id,
                label: `#${p.number} - ${p.title}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
