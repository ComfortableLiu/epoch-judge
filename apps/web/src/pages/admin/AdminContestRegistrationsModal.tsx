import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Select, Switch, Table, Typography } from 'antd';
import { appMessage } from '../../lib/app-message';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      appMessage.success(t('admin.contests.registrationAdded'));
      setAddUserId(null);
      void qc.invalidateQueries({ queryKey: ['admin-contest-registrations', contestId] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  return (
    <Modal
      title={t('admin.contests.registrationsTitle', { title: contestTitle })}
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        {t('admin.contests.registrationsHint')}
      </Typography.Paragraph>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Select
          showSearch
          allowClear
          placeholder={t('admin.contests.addParticipant')}
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
          {t('common.add')}
        </Button>
      </div>

      <Table<RegistrationRow>
        loading={registrations.isLoading}
        dataSource={registrations.data ?? []}
        rowKey="userId"
        pagination={{ pageSize: 15 }}
        size="small"
        columns={[
          { title: t('admin.contests.colUsername'), dataIndex: 'username', width: 120 },
          {
            title: t('admin.contests.colDisplayName'),
            dataIndex: 'displayName',
            render: (v, row) => (
              <>
                {v}
                {row.currentDisplayName &&
                  row.currentDisplayName !== row.displayNameSnapshot && (
                    <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                      {t('admin.contests.currentProfile', { name: row.currentDisplayName })}
                    </Typography.Text>
                  )}
              </>
            ),
          },
          {
            title: t('admin.contests.colStarTeam'),
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
            title: t('admin.contests.colRegisteredAt'),
            dataIndex: 'createdAt',
            width: 168,
            render: (v: string) => new Date(v).toLocaleString(),
          },
        ]}
      />
    </Modal>
  );
}
