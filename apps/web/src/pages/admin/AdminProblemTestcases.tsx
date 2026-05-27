import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
} from 'antd';
import { useState } from 'react';
import { appMessage } from '../../lib/app-message';
import { api } from '../../api/client';

export type TestcaseRow = {
  id: string;
  ordinal: number;
  score: number;
  isSample: boolean;
  inputSize: number;
  outputSize: number;
};

type TestcaseFormValues = {
  ordinal?: number;
  score: number;
  isSample: boolean;
  input: string;
  output: string;
};

type Props = {
  problemId: string;
  enabled: boolean;
};

export function AdminProblemTestcases({ problemId, enabled }: Props) {
  const qc = useQueryClient();
  const [tcForm] = Form.useForm<TestcaseFormValues>();
  const [tcOpen, setTcOpen] = useState(false);
  const [editingTc, setEditingTc] = useState<TestcaseRow | null>(null);
  const [loadingTc, setLoadingTc] = useState(false);

  const testcases = useQuery({
    queryKey: ['admin-testcases', problemId],
    queryFn: () => api<TestcaseRow[]>(`/problems/${problemId}/testcases`),
    enabled: enabled && Boolean(problemId),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-testcases', problemId] });
  };

  const saveTc = useMutation({
    mutationFn: (values: TestcaseFormValues) => {
      const body = {
        input: values.input,
        output: values.output,
        score: values.score,
        isSample: values.isSample,
        ...(values.ordinal !== undefined ? { ordinal: values.ordinal } : {}),
      };
      if (editingTc) {
        return api(`/problems/${problemId}/testcases/${editingTc.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      return api(`/problems/${problemId}/testcases`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      appMessage.success(editingTc ? '测例已更新' : '测例已添加');
      setTcOpen(false);
      setEditingTc(null);
      tcForm.resetFields();
      invalidate();
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const deleteTc = useMutation({
    mutationFn: (testcaseId: string) =>
      api(`/problems/${problemId}/testcases/${testcaseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      appMessage.success('测例已删除');
      invalidate();
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const openCreate = () => {
    setEditingTc(null);
    tcForm.resetFields();
    tcForm.setFieldsValue({ score: 10, isSample: false, input: '', output: '' });
    setTcOpen(true);
  };

  const openEditTc = async (row: TestcaseRow) => {
    setEditingTc(row);
    setLoadingTc(true);
    setTcOpen(true);
    try {
      const detail = await api<TestcaseFormValues & { id: string }>(
        `/problems/${problemId}/testcases/${row.id}`,
      );
      tcForm.setFieldsValue({
        ordinal: detail.ordinal,
        score: detail.score,
        isSample: detail.isSample,
        input: detail.input,
        output: detail.output,
      });
    } catch (e) {
      appMessage.error(e instanceof Error ? e.message : '加载失败');
      setTcOpen(false);
      setEditingTc(null);
    } finally {
      setLoadingTc(false);
    }
  };

  return (
    <>
      <Button type="primary" style={{ marginBottom: 12 }} onClick={openCreate}>
        添加测例
      </Button>
      <Table
        size="small"
        loading={testcases.isLoading}
        dataSource={testcases.data ?? []}
        rowKey="id"
        pagination={false}
        columns={[
          { title: '#', dataIndex: 'ordinal', width: 56 },
          { title: '分数', dataIndex: 'score', width: 72 },
          {
            title: '样例',
            dataIndex: 'isSample',
            width: 72,
            render: (v: boolean) => (v ? '是' : '否'),
          },
          { title: '输入(B)', dataIndex: 'inputSize', width: 88 },
          { title: '输出(B)', dataIndex: 'outputSize', width: 88 },
          {
            title: '操作',
            key: 'actions',
            width: 140,
            render: (_, row) => (
              <Space>
                <Button type="link" size="small" onClick={() => void openEditTc(row)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除该测例？"
                  onConfirm={() => deleteTc.mutate(row.id)}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingTc ? `编辑测例 #${editingTc.ordinal}` : '添加测例'}
        open={tcOpen}
        width={640}
        onCancel={() => {
          setTcOpen(false);
          setEditingTc(null);
        }}
        onOk={() => tcForm.submit()}
        confirmLoading={saveTc.isPending || loadingTc}
        destroyOnClose
      >
        <Form
          form={tcForm}
          layout="vertical"
          onFinish={(v) => saveTc.mutate(v)}
        >
          <Space wrap>
            <Form.Item name="ordinal" label="序号">
              <InputNumber min={0} placeholder="留空自动追加" />
            </Form.Item>
            <Form.Item
              name="score"
              label="分数"
              rules={[{ required: true, message: '请输入分数' }]}
            >
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="isSample" label="样例" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            name="input"
            label="输入数据"
            rules={[{ required: true, message: '请输入输入' }]}
          >
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item
            name="output"
            label="期望输出"
            rules={[{ required: true, message: '请输入输出' }]}
          >
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
