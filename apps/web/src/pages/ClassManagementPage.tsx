import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, message, Modal, Space, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api, decodeTokenPayload, getToken } from '../api/client';

interface ClassRow {
  id: string;
  name: string;
  description: string;
  invitationCode: string;
  createdAt: string;
  memberCount?: number;
  homeworkCount?: number;
}

interface MemberRow {
  userId: string;
  username: string;
  displayName: string | null;
  joinedAt: string;
}

interface MyClassesResponse {
  taught: ClassRow[];
  joined: ClassRow[];
}

export function ClassManagementPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [createForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [memberModal, setMemberModal] = useState<{ classId: string; className: string } | null>(null);

  const token = getToken();
  const payload = token ? decodeTokenPayload(token) : null;
  const isTeacher = payload?.role === 'ADMIN' || payload?.role === 'PROBLEM_EDITOR';

  const { data, isLoading } = useQuery({
    queryKey: ['classes', 'my'],
    queryFn: () => api<MyClassesResponse>('/classes/my'),
    placeholderData: keepPreviousData,
  });

  const createMut = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      api('/classes', { method: 'POST', body: JSON.stringify(values), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      message.success(t('common.success'));
      setCreateOpen(false);
      createForm.resetFields();
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const taughtColumns: ColumnsType<ClassRow> = useMemo(
    () => [
      { title: t('classes.colName'), dataIndex: 'name', key: 'name' },
      { title: t('classes.colDescription'), dataIndex: 'description', key: 'description', ellipsis: true },
      { title: t('classes.colMembers'), dataIndex: 'memberCount', key: 'members', width: 80 },
      { title: t('classes.colHomeworks'), dataIndex: 'homeworkCount', key: 'homeworks', width: 80 },
      {
        title: t('classes.colCode'),
        dataIndex: 'invitationCode',
        key: 'code',
        width: 120,
        render: (code: string) => (
          <Tooltip title={t('classes.copyCode')}>
            <Tag
              style={{ cursor: 'pointer' }}
              onClick={() => {
                navigator.clipboard.writeText(code);
                message.success(t('classes.copied'));
              }}
            >
              {code}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: t('classes.colActions'),
        key: 'actions',
        width: 160,
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => setMemberModal({ classId: row.id, className: row.name })}>
              {t('classes.viewMembers')}
            </Button>
            <Button size="small" onClick={() => nav(`/homework?classId=${row.id}`)}>
              {t('homework.title')}
            </Button>
          </Space>
        ),
      },
    ],
    [t, nav],
  );

  const joinedColumns: ColumnsType<ClassRow> = useMemo(
    () => [
      { title: t('classes.colName'), dataIndex: 'name', key: 'name' },
      { title: t('classes.colDescription'), dataIndex: 'description', key: 'description', ellipsis: true },
      { title: t('classes.colMembers'), dataIndex: 'memberCount', key: 'members', width: 80 },
      { title: t('classes.colHomeworks'), dataIndex: 'homeworkCount', key: 'homeworks', width: 80 },
      {
        title: t('classes.colActions'),
        key: 'actions',
        width: 100,
        render: (_, row) => (
          <Button size="small" onClick={() => nav(`/homework?classId=${row.id}`)}>
            {t('homework.title')}
          </Button>
        ),
      },
    ],
    [t, nav],
  );

  return (
    <>
      <Card
        title={t('classes.title')}
        extra={
          isTeacher && (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              {t('classes.create')}
            </Button>
          )
        }
      >
        <Tabs
          items={[
            ...(isTeacher
              ? [
                  {
                    key: 'taught',
                    label: t('classes.tabTaught'),
                    children: (
                      <Table<ClassRow>
                        dataSource={data?.taught ?? []}
                        rowKey="id"
                        columns={taughtColumns}
                        loading={isLoading}
                        pagination={false}
                        locale={{ emptyText: t('classes.noTaughtClasses') }}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: 'joined',
              label: t('classes.tabJoined'),
              children: (
                <Table<ClassRow>
                  dataSource={data?.joined ?? []}
                  rowKey="id"
                  columns={joinedColumns}
                  loading={isLoading}
                  pagination={false}
                  locale={{ emptyText: t('classes.noJoinedClasses') }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={t('classes.createTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMut.isPending}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          <Form.Item name="name" label={t('classes.name')} rules={[{ required: true, message: t('classes.nameRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('classes.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {memberModal && (
        <MemberListModal
          classId={memberModal.classId}
          className={memberModal.className}
          isTeacher={isTeacher}
          onClose={() => setMemberModal(null)}
        />
      )}
    </>
  );
}

function MemberListModal({
  classId,
  className,
  isTeacher,
  onClose,
}: {
  classId: string;
  className: string;
  isTeacher: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['classes', classId, 'members'],
    queryFn: () => api<MemberRow[]>(`/classes/${classId}/members`),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) =>
      api(`/classes/${classId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      message.success(t('classes.removeSuccess'));
      qc.invalidateQueries({ queryKey: ['classes', classId, 'members'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const columns: ColumnsType<MemberRow> = [
    { title: t('classes.colUsername'), dataIndex: 'username', key: 'username' },
    { title: t('classes.colDisplayName'), dataIndex: 'displayName', key: 'displayName', render: (v: string | null) => v || '—' },
    { title: t('classes.colJoinedAt'), dataIndex: 'joinedAt', key: 'joinedAt', render: (v: string) => new Date(v).toLocaleString() },
    ...(isTeacher
      ? [
          {
            title: t('classes.colActions'),
            key: 'actions',
            width: 80,
            render: (_: unknown, row: MemberRow) => (
              <Button
                danger
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: t('classes.removeConfirm'),
                    onOk: () => removeMut.mutate(row.userId),
                  });
                }}
              >
                {t('classes.removeMember')}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      title={t('classes.memberList', { name: className })}
      open
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <Table<MemberRow>
        dataSource={data ?? []}
        rowKey="userId"
        columns={columns}
        loading={isLoading}
        pagination={false}
        size="small"
      />
    </Modal>
  );
}
