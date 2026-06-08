import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { appMessage } from '../../lib/app-message';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; username: string; displayName: string | null } | null;
}

interface AnnouncementsResponse {
  items: Announcement[];
  total: number;
  page: number;
  limit: number;
}

export function AdminAnnouncementPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', page],
    queryFn: () => api<AnnouncementsResponse>(`/admin/announcements?page=${page}&limit=20`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/admin/announcements', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      appMessage.success(t('admin.announcements.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) => api(`/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      appMessage.success(t('admin.announcements.updateSuccess'));
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      appMessage.success(t('admin.announcements.deleteSuccess'));
      void qc.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editing) {
        updateMutation.mutate({ id: editing.id, ...values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  /** Convert UTC ISO string to local datetime-local input format (YYYY-MM-DDTHH:mm) */
  const toLocalDatetime = (isoStr: string | null): string | null => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = (record: Announcement) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      isPinned: record.isPinned,
      startsAt: toLocalDatetime(record.startsAt),
      endsAt: toLocalDatetime(record.endsAt),
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: t('admin.announcements.colTitle'), dataIndex: 'title', key: 'title' },
    {
      title: t('admin.announcements.colPinned'),
      dataIndex: 'isPinned',
      key: 'isPinned',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="red">{t('admin.announcements.pinned')}</Tag> : <Tag>{t('admin.announcements.normal')}</Tag>),
    },
    {
      title: t('admin.announcements.colStartsAt'),
      dataIndex: 'startsAt',
      key: 'startsAt',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: t('admin.announcements.colEndsAt'),
      dataIndex: 'endsAt',
      key: 'endsAt',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: t('admin.announcements.colCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: t('admin.announcements.colActions'),
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Announcement) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            {t('admin.announcements.edit')}
          </Button>
          <Popconfirm
            title={t('admin.announcements.deleteConfirm')}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button size="small" danger>
              {t('admin.announcements.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" onClick={handleCreate} style={{ marginBottom: 16 }}>
        {t('admin.announcements.create')}
      </Button>
      <Table
        loading={isLoading}
        dataSource={data?.items ?? []}
        rowKey="id"
        columns={columns}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
        }}
      />
      <Modal
        title={editing ? t('admin.announcements.editTitle') : t('admin.announcements.createTitle')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('admin.announcements.formTitle')} rules={[{ required: true, message: t('admin.announcements.titleRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label={t('admin.announcements.formContent')} rules={[{ required: true, message: t('admin.announcements.contentRequired') }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="isPinned" label={t('admin.announcements.formPinned')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="startsAt" label={t('admin.announcements.formStartsAt')}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endsAt" label={t('admin.announcements.formEndsAt')}>
            <Input type="datetime-local" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
