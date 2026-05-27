import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Upload,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appMessage } from '../../lib/app-message';
import { useSearchParams } from 'react-router-dom';
import { api, getToken } from '../../api/client';
import { AdminProblemTestcases } from './AdminProblemTestcases';
import {
  parseProblemEditSection,
  type ProblemEditSection,
} from './admin-url';

type ProblemRow = {
  id: string;
  number: number;
  title: string;
  visibility: string;
  difficulty: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  tags?: string[];
};

type ProblemDetail = ProblemRow & {
  statement: string;
};

type ProblemFormValues = {
  title: string;
  statement: string;
  visibility: string;
  difficulty: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  tags?: string[];
};

type CreateFormValues = {
  title: string;
  visibility?: string;
  tags?: string[];
};

export function AdminProblemPanel() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<ProblemFormValues>();
  const [createForm] = Form.useForm<CreateFormValues>();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportRow, setExportRow] = useState<ProblemRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<ProblemRow | null>(null);
  const restoredNumber = useRef<string | null>(null);
  const loadSeq = useRef(0);

  const editNumber = searchParams.get('edit');
  const editSection = parseProblemEditSection(searchParams.get('section'));

  const problems = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () => api<ProblemRow[]>('/problems?all=1'),
  });

  const patchSearch = useCallback(
    (patch: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'problems');
          patch(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setEditInUrl = useCallback(
    (problemNumber: string | null, section?: ProblemEditSection) => {
      patchSearch((next) => {
        if (problemNumber) {
          next.set('edit', problemNumber);
          next.set('section', section ?? parseProblemEditSection(next.get('section')));
        } else {
          next.delete('edit');
          next.delete('section');
        }
      });
    },
    [patchSearch],
  );

  const setSectionInUrl = (section: ProblemEditSection) => {
    patchSearch((next) => {
      next.set('section', section);
    });
  };

  const closeEdit = () => {
    loadSeq.current += 1;
    if (editNumber) {
      restoredNumber.current = editNumber;
    }
    setOpen(false);
    setEditing(null);
    setEditInUrl(null);
  };

  const loadProblemDetail = async (row: ProblemRow) => {
    const seq = ++loadSeq.current;
    setEditing(row);
    setOpen(true);
    try {
      const detail = await api<ProblemDetail>(`/problems/${row.number}`);
      if (seq !== loadSeq.current) return;
      form.setFieldsValue({
        title: detail.title,
        statement: detail.statement,
        visibility: detail.visibility,
        difficulty: detail.difficulty,
        timeLimitMs: detail.timeLimitMs,
        memoryLimitKb: detail.memoryLimitKb,
        tags: detail.tags ?? [],
      });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      appMessage.error(e instanceof Error ? e.message : '加载失败');
      closeEdit();
    }
  };

  const openEdit = async (row: ProblemRow, section: ProblemEditSection = 'meta') => {
    restoredNumber.current = null;
    setEditInUrl(String(row.number), section);
    await loadProblemDetail(row);
  };

  useEffect(() => {
    if (!editNumber) {
      restoredNumber.current = null;
      return;
    }
    if (problems.isLoading || !problems.data) return;
    if (open && editing && String(editing.number) === editNumber) return;
    if (restoredNumber.current === editNumber) return;

    const row = problems.data.find((p) => String(p.number) === editNumber);
    if (!row) return;

    restoredNumber.current = editNumber;
    void loadProblemDetail(row);
  }, [editNumber, problems.data, problems.isLoading, open, editing?.number]);

  const saveProblem = useMutation({
    mutationFn: (values: ProblemFormValues) => {
      if (!editing) return Promise.reject(new Error('No problem selected'));
      return api(`/problems/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      appMessage.success('题目已保存');
      void qc.invalidateQueries({ queryKey: ['admin-problems'] });
      closeEdit();
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const createProblem = useMutation({
    mutationFn: (values: CreateFormValues) =>
      api<{ id: string; number: number }>('/problems', {
        method: 'POST',
        body: JSON.stringify({
          title: values.title,
          visibility: values.visibility ?? 'PRIVATE',
          tags: values.tags ?? [],
        }),
      }),
    onSuccess: async (created) => {
      appMessage.success(`题目 #${created.number} 已创建`);
      setCreateOpen(false);
      createForm.resetFields();
      void qc.invalidateQueries({ queryKey: ['admin-problems'] });
      const row = {
        id: created.id,
        number: created.number,
        title: createForm.getFieldValue('title') as string,
        visibility: createForm.getFieldValue('visibility') as string,
        difficulty: 1,
        timeLimitMs: 1000,
        memoryLimitKb: 262144,
      };
      await openEdit(row, 'meta');
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const downloadExport = async (problemId: string, includeTestdata: boolean) => {
    const token = getToken();
    if (!token) {
      appMessage.error('请先登录');
      return;
    }
    const q = includeTestdata ? 'true' : 'false';
    const res = await fetch(
      `/api/v1/problems/${problemId}/export?testdata=${q}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      appMessage.error((err as { message?: string }).message ?? '导出失败');
      return;
    }
    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition');
    const match = disp?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? 'problem.zip';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    appMessage.success('导出已开始下载');
  };

  const runExport = async (includeTestdata: boolean) => {
    if (!exportRow) return;
    setExporting(true);
    try {
      await downloadExport(exportRow.id, includeTestdata);
      setExportRow(null);
    } finally {
      setExporting(false);
    }
  };

  const uploadHeaders = { Authorization: `Bearer ${getToken()}` };

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新建题目
        </Button>
        <Upload
          action="/api/v1/problems/import"
          headers={uploadHeaders}
          name="file"
          accept=".zip"
          showUploadList={false}
          onChange={(info) => {
            if (info.file.status === 'done') {
              appMessage.success('题目导入成功');
              void qc.invalidateQueries({ queryKey: ['admin-problems'] });
            }
            if (info.file.status === 'error') {
              appMessage.error('导入失败');
            }
          }}
        >
          <Button>ZIP 导入题目</Button>
        </Upload>
        <a href="/api/v1/templates/problem-import.zip">下载模板</a>
      </Space>

      <Table
        loading={problems.isLoading}
        dataSource={problems.data ?? []}
        rowKey="id"
        columns={[
          {
            title: 'ID',
            dataIndex: 'number',
            width: 72,
            render: (n: number) => `#${n}`,
          },
          { title: '标题', dataIndex: 'title' },
          {
            title: '标签',
            dataIndex: 'tags',
            render: (tags: string[] | undefined) =>
              tags?.length ? tags.join(', ') : '—',
          },
          { title: '可见性', dataIndex: 'visibility' },
          { title: '难度', dataIndex: 'difficulty' },
          { title: '时限(ms)', dataIndex: 'timeLimitMs' },
          {
            title: '操作',
            key: 'actions',
            width: 160,
            render: (_, row) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  onClick={() => void openEdit(row, editSection)}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setExportRow(row)}
                >
                  导出
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={exportRow ? `导出题目 #${exportRow.number}` : '导出题目'}
        open={exportRow != null}
        onCancel={() => setExportRow(null)}
        footer={
          <Space>
            <Button onClick={() => setExportRow(null)} disabled={exporting}>
              取消
            </Button>
            <Button loading={exporting} onClick={() => void runExport(false)}>
              仅题目与题面
            </Button>
            <Button
              type="primary"
              loading={exporting}
              onClick={() => void runExport(true)}
            >
              包含测试数据
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <p style={{ margin: 0 }}>
          导出 ZIP 与「ZIP 导入题目」模板格式一致。不含测试数据时仅包含题面、元数据与
          assets。
        </p>
      </Modal>

      <Modal
        title="新建题目"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createProblem.isPending}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ visibility: 'PRIVATE', tags: [] }}
          onFinish={(v) => createProblem.mutate(v)}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="visibility" label="可见性">
            <Select
              options={[
                { value: 'PRIVATE', label: 'PRIVATE' },
                { value: 'PUBLIC', label: 'PUBLIC' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="tags"
            label="标签（最多 5 个，每个 ≤10 字）"
            rules={[
              {
                validator: (_, val: string[] | undefined) => {
                  const n = val?.length ?? 0;
                  if (n > 5) return Promise.reject(new Error('最多 5 个标签'));
                  if (val?.some((t) => t.trim().length > 10)) {
                    return Promise.reject(new Error('单个标签最多 10 个字符'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editing ? `编辑题目 #${editing.number}` : '编辑题目'}
        open={open}
        width={900}
        onCancel={closeEdit}
        footer={
          <Space>
            <Button onClick={closeEdit}>关闭</Button>
            <Button
              type="primary"
              loading={saveProblem.isPending}
              onClick={() => form.submit()}
            >
              保存题目信息
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Tabs
          activeKey={editSection}
          onChange={(key) => setSectionInUrl(parseProblemEditSection(key))}
          items={[
            {
              key: 'meta',
              label: '题目信息',
              children: (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={(v) => saveProblem.mutate(v)}
                >
                  <Form.Item
                    name="title"
                    label="标题"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="statement"
                    label="题面（Markdown）"
                    rules={[{ required: true, message: '请输入题面' }]}
                  >
                    <Input.TextArea rows={12} />
                  </Form.Item>
                  <Form.Item
                    name="tags"
                    label="标签（最多 5 个，每个 ≤10 字）"
                    rules={[
                      {
                        validator: (_, val: string[] | undefined) => {
                          const n = val?.length ?? 0;
                          if (n > 5) return Promise.reject(new Error('最多 5 个标签'));
                          if (val?.some((t) => t.trim().length > 10)) {
                            return Promise.reject(new Error('单个标签最多 10 个字符'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Select mode="tags" tokenSeparators={[',']} />
                  </Form.Item>
                  <Space wrap size="large">
                    <Form.Item name="visibility" label="可见性" rules={[{ required: true }]}>
                      <Select
                        style={{ width: 140 }}
                        options={[
                          { value: 'PUBLIC', label: 'PUBLIC' },
                          { value: 'PRIVATE', label: 'PRIVATE' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
                      <InputNumber min={1} max={10} />
                    </Form.Item>
                    <Form.Item name="timeLimitMs" label="时限(ms)" rules={[{ required: true }]}>
                      <InputNumber min={100} step={100} />
                    </Form.Item>
                    <Form.Item name="memoryLimitKb" label="内存(KB)" rules={[{ required: true }]}>
                      <InputNumber min={1024} step={1024} />
                    </Form.Item>
                  </Space>
                </Form>
              ),
            },
            {
              key: 'testcases',
              label: '测试用例',
              children: editing ? (
                <AdminProblemTestcases problemId={editing.id} enabled={open} />
              ) : null,
            },
          ]}
        />
      </Modal>
    </>
  );
}
