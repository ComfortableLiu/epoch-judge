import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Select, Switch, Table, Typography } from 'antd';
import { appMessage } from '../../lib/app-message';
import { useState } from 'react';
import { api } from '../../api/client';

type RegistrationRow = {
  userId: string;
  username: string;
  displayNameSnapshot: string;
  displayName: string;
  isStarTeam: boolean;
  passwordVerified: boolean;
  createdAt: string;
  currentDisplayName: string | null;
};

type UserOption = {
  id: string;
  username: string;
  displayName: string | null;
};

type Props = {
  contestId: string;
  contestTitle: string;
  open: boolean;
  onClose: () => void;
};

export function AdminContestRegistrationsModal({
  contestId,
  contestTitle,
  open,
  onClose,
}: Props) {
  const qc = useQueryClient();
  const [addUserId, setAddUserId] = useState<string | null>(null);

  const registrations = useQuery({
    queryKey: ['admin-contest-registrations', contestId],
    queryFn: () =>
      api<RegistrationRow[]>(`/admin/contests/${contestId}/registrations`),
    enabled: open && Boolean(contestId),
  });

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<UserOption[]>('/users'),
    enabled: open,
  });

  const registeredIds = new Set((registrations.data ?? []).map((r) => r.userId));

  const toggleStar = useMutation({
    mutationFn: ({ userId, isStarTeam }: { userId: string; isStarTeam: boolean }) =>
      api(`/admin/contests/${contestId}/registrations/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isStarTeam }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-contest-registrations', contestId] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const addRegistration = useMutation({
    mutationFn: (userId: string) =>
      api(`/admin/contests/${contestId}/registrations`, {
        method: 'POST',
        body: JSON.stringify({ userId, isStarTeam: false }),
      }),
    onSuccess: () => {
      appMessage.success('已添加报名记录');
      setAddUserId(null);
      void qc.invalidateQueries({ queryKey: ['admin-contest-registrations', contestId] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  return (
    <Modal
      title={`报名与打星 — ${contestTitle}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        比赛榜单使用报名时的昵称快照，不随用户后续修改资料而变化。打星队伍名前带
        <Typography.Text code>*</Typography.Text>
        ，且不计入官方排名与成绩。
      </Typography.Paragraph>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Select
          showSearch
          allowClear
          placeholder="添加参赛者（冻结当前昵称）"
          style={{ flex: 1, maxWidth: 400 }}
          value={addUserId}
          onChange={setAddUserId}
          optionFilterProp="label"
          options={(users.data ?? [])
            .filter((u) => !registeredIds.has(u.id))
            .map((u) => ({
              value: u.id,
              label: `${u.username}${u.displayName ? `（${u.displayName}）` : ''}`,
            }))}
        />
        <Button
          type="primary"
          disabled={!addUserId}
          loading={addRegistration.isPending}
          onClick={() => addUserId && addRegistration.mutate(addUserId)}
        >
          添加
        </Button>
      </div>

      <Table<RegistrationRow>
        loading={registrations.isLoading}
        dataSource={registrations.data ?? []}
        rowKey="userId"
        pagination={{ pageSize: 15 }}
        size="small"
        columns={[
          { title: '用户名', dataIndex: 'username', width: 120 },
          {
            title: '榜单展示名（快照）',
            dataIndex: 'displayName',
            render: (v, row) => (
              <>
                {v}
                {row.currentDisplayName &&
                  row.currentDisplayName !== row.displayNameSnapshot && (
                    <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                      当前资料：{row.currentDisplayName}
                    </Typography.Text>
                  )}
              </>
            ),
          },
          {
            title: '打星队伍',
            dataIndex: 'isStarTeam',
            width: 100,
            render: (v: boolean, row) => (
              <Switch
                checked={v}
                loading={toggleStar.isPending}
                onChange={(checked) =>
                  toggleStar.mutate({ userId: row.userId, isStarTeam: checked })
                }
              />
            ),
          },
          {
            title: '报名时间',
            dataIndex: 'createdAt',
            width: 168,
            render: (v: string) => new Date(v).toLocaleString(),
          },
        ]}
      />
    </Modal>
  );
}
