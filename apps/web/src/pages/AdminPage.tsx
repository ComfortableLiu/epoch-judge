import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Table, Tabs } from 'antd';
import { appMessage } from '../lib/app-message';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { AdminAnnouncementPanel } from './admin/AdminAnnouncementPanel';
import { AdminContestPanel } from './admin/AdminContestPanel';
import { AdminProblemPanel } from './admin/AdminProblemPanel';
import { AdminRejudgePanel } from './admin/AdminRejudgePanel';
import { AdminUserPanel } from './admin/AdminUserPanel';
import { ADMIN_TABS, parseAdminTab, type AdminTab } from './admin/admin-url';

export function AdminPage() {
  const { t } = useTranslation();
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
      appMessage.success(t('common.success'));
      void qc.invalidateQueries({ queryKey: ['admin-config'] });
    },
  });

  return (
    <Card title={t('admin.title')}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setTab(parseAdminTab(key))}
        items={ADMIN_TABS.map((key) => {
          const labels: Record<AdminTab, string> = {
            problems: t('admin.tabs.problems'),
            contests: t('admin.tabs.contests'),
            announcements: t('admin.tabs.announcements'),
            rejudge: t('admin.tabs.rejudge'),
            users: t('admin.tabs.users'),
            judge: t('admin.tabs.judge'),
            config: t('admin.tabs.config'),
          };
          const children =
            key === 'users' ? (
              <AdminUserPanel />
            ) : key === 'problems' ? (
              <AdminProblemPanel />
            ) : key === 'contests' ? (
              <AdminContestPanel />
            ) : key === 'announcements' ? (
              <AdminAnnouncementPanel />
            ) : key === 'rejudge' ? (
              <AdminRejudgePanel />
            ) : key === 'judge' ? (
              <Table
                loading={nodes.isLoading}
                dataSource={nodes.data ?? []}
                rowKey="id"
                columns={[
                  { title: t('admin.judgeNodes.name'), dataIndex: 'name' },
                  {
                    title: t('admin.judgeNodes.online'),
                    dataIndex: 'isOnline',
                    render: (v: boolean) => v ? t('common.yes') : t('common.no'),
                  },
                  { title: t('admin.judgeNodes.concurrency'), dataIndex: 'concurrency' },
                  { title: t('admin.judgeNodes.heartbeat'), dataIndex: 'lastHeartbeat' },
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
                <Form.Item name="key" label={t('admin.config.key')}>
                  <Input />
                </Form.Item>
                <Form.Item name="value" label={t('admin.config.value')}>
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveConfig.isPending}>
                  {t('common.save')}
                </Button>
              </Form>
            );
          return { key, label: labels[key], children };
        })}
      />
    </Card>
  );
}
