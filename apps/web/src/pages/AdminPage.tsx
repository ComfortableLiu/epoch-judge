import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Table,
  Tabs,
  Upload,
} from 'antd';
import { api, getToken } from '../api/client';

export function AdminPage() {
  const qc = useQueryClient();
  const nodes = useQuery({
    queryKey: ['judge-nodes'],
    queryFn: () =>
      api<{ id: string; name: string; isOnline: boolean; lastHeartbeat: string; concurrency: number }[]>(
        '/admin/judge-nodes',
      ),
  });
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      api<{ id: string; username: string; role: string; email: string | null }[]>(
        '/users',
      ),
  });
  const problems = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () =>
      api<{ id: string; slug: string; title: string; visibility: string }[]>(
        '/problems?all=1',
      ),
  });
  const config = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api<{ key: string; value: string }[]>('/admin/config'),
  });

  const saveConfig = useMutation({
    mutationFn: (body: { key: string; value: string }) =>
      api('/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      message.success('Saved');
      void qc.invalidateQueries({ queryKey: ['admin-config'] });
    },
  });

  const uploadHeaders = { Authorization: `Bearer ${getToken()}` };

  return (
    <Card title="管理后台">
      <Tabs
        items={[
          {
            key: 'users',
            label: '用户',
            children: (
              <>
                <Upload
                  action="/api/v1/users/import"
                  headers={uploadHeaders}
                  name="file"
                  accept=".csv"
                  showUploadList={false}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('Import finished');
                      void qc.invalidateQueries({ queryKey: ['admin-users'] });
                    }
                  }}
                >
                  <Button style={{ marginBottom: 12 }}>批量导入 CSV</Button>
                </Upload>
                <a href="/api/v1/templates/user-import.csv">下载模板</a>
                <Table
                  loading={users.isLoading}
                  dataSource={users.data ?? []}
                  rowKey="id"
                  columns={[
                    { title: 'Username', dataIndex: 'username' },
                    { title: 'Email', dataIndex: 'email' },
                    { title: 'Role', dataIndex: 'role' },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'problems',
            label: '题目',
            children: (
              <>
                <Upload
                  action="/api/v1/problems/import"
                  headers={uploadHeaders}
                  name="file"
                  accept=".zip"
                  showUploadList={false}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('Problem imported');
                      void qc.invalidateQueries({ queryKey: ['admin-problems'] });
                    }
                  }}
                >
                  <Button style={{ marginBottom: 12 }}>ZIP 导入题目</Button>
                </Upload>
                <a href="/api/v1/templates/problem-import.zip" style={{ marginLeft: 12 }}>
                  下载模板
                </a>
                <Table
                  loading={problems.isLoading}
                  dataSource={problems.data ?? []}
                  rowKey="id"
                  columns={[
                    { title: 'Slug', dataIndex: 'slug' },
                    { title: 'Title', dataIndex: 'title' },
                    { title: 'Visibility', dataIndex: 'visibility' },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'judge',
            label: '判题',
            children: (
              <Table
                loading={nodes.isLoading}
                dataSource={nodes.data ?? []}
                rowKey="id"
                columns={[
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Online', dataIndex: 'isOnline' },
                  { title: 'Concurrency', dataIndex: 'concurrency' },
                  { title: 'Heartbeat', dataIndex: 'lastHeartbeat' },
                ]}
              />
            ),
          },
          {
            key: 'config',
            label: '配置',
            children: (
              <Form
                layout="vertical"
                onFinish={(v) => saveConfig.mutate(v)}
                initialValues={{
                  key: 'judge.global_max_inflight',
                  value:
                    config.data?.find((c) => c.key === 'judge.global_max_inflight')
                      ?.value ?? '10',
                }}
              >
                <Form.Item name="key" label="Key">
                  <Input />
                </Form.Item>
                <Form.Item name="value" label="Value">
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveConfig.isPending}>
                  保存
                </Button>
              </Form>
            ),
          },
        ]}
      />
    </Card>
  );
}
