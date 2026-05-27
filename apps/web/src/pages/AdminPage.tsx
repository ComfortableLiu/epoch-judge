import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Table, Tabs } from 'antd';
import { appMessage } from '../lib/app-message';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { AdminContestPanel } from './admin/AdminContestPanel';
import { AdminProblemPanel } from './admin/AdminProblemPanel';
import { AdminRejudgePanel } from './admin/AdminRejudgePanel';
import { AdminUserPanel } from './admin/AdminUserPanel';
import { ADMIN_TABS, parseAdminTab, type AdminTab } from './admin/admin-url';

export function AdminPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseAdminTab(searchParams.get('tab'), {
    hasProblemEdit: Boolean(searchParams.get('edit')),
  });

  const setTab = (tab: AdminTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        if (tab !== 'problems') {
          next.delete('edit');
          next.delete('section');
        }
        return next;
      },
      { replace: true },
    );
  };

  const nodes = useQuery({
    queryKey: ['judge-nodes'],
    queryFn: () =>
      api<
        {
          id: string;
          name: string;
          isOnline: boolean;
          lastHeartbeat: string;
          concurrency: number;
        }[]
      >('/admin/judge-nodes'),
  });
  const config = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api<{ key: string; value: string }[]>('/admin/config'),
  });

  const saveConfig = useMutation({
    mutationFn: (body: { key: string; value: string }) =>
      api('/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      appMessage.success('已保存');
      void qc.invalidateQueries({ queryKey: ['admin-config'] });
    },
  });

  return (
    <Card title="管理后台">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setTab(parseAdminTab(key))}
        items={ADMIN_TABS.map((key) => {
          const labels: Record<AdminTab, string> = {
            problems: '题目',
            contests: '比赛',
            rejudge: '重判',
            users: '用户',
            judge: '判题',
            config: '配置',
          };
          const children =
            key === 'users' ? (
              <AdminUserPanel />
            ) : key === 'problems' ? (
              <AdminProblemPanel />
            ) : key === 'contests' ? (
              <AdminContestPanel />
            ) : key === 'rejudge' ? (
              <AdminRejudgePanel />
            ) : key === 'judge' ? (
              <Table
                loading={nodes.isLoading}
                dataSource={nodes.data ?? []}
                rowKey="id"
                columns={[
                  { title: '节点', dataIndex: 'name' },
                  {
                    title: '在线',
                    dataIndex: 'isOnline',
                    render: (v: boolean) => (v ? '是' : '否'),
                  },
                  { title: '并发', dataIndex: 'concurrency' },
                  { title: '心跳', dataIndex: 'lastHeartbeat' },
                ]}
              />
            ) : (
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
                <Form.Item name="key" label="配置项">
                  <Input />
                </Form.Item>
                <Form.Item name="value" label="值">
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveConfig.isPending}>
                  保存
                </Button>
              </Form>
            );
          return { key, label: labels[key], children };
        })}
      />
    </Card>
  );
}
