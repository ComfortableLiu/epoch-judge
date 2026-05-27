import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Upload,
} from 'antd';
import { useState } from 'react';
import { appMessage } from '../../lib/app-message';
import { appModal } from '../../lib/app-modal';
import { api, getToken } from '../../api/client';

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  role: string;
  createdAt: string;
};

type UserFormValues = {
  username?: string;
  password?: string;
  email?: string;
  displayName?: string;
  role: string;
};

const ROLES = ['USER', 'ADMIN', 'PROBLEM_EDITOR'] as const;

export function AdminUserPanel() {
  const qc = useQueryClient();
  const [form] = Form.useForm<UserFormValues>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<UserRow[]>('/users'),
  });

  const saveUser = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (editing) {
        const body: Record<string, string | null> = {
          email: values.email?.trim() || null,
          displayName: values.displayName?.trim() || null,
          role: values.role,
        };
        if (values.password?.trim()) {
          body.password = values.password.trim();
        }
        return api(`/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      return api('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          email: values.email || undefined,
          displayName: values.displayName || undefined,
          role: values.role,
        }),
      });
    },
    onSuccess: () => {
      appMessage.success(editing ? '用户已更新' : '用户已创建');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: (id: string) =>
      api(`/users/${id}/reset-password`, { method: 'POST' }),
    onSuccess: (res: { username?: string }) => {
      appMessage.success(
        res?.username
          ? `已重置「${res.username}」的密码，请通知其用原用户名在注册页设置新密码`
          : '密码已重置',
      );
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const confirmResetPassword = (row: UserRow) => {
    appModal.confirm({
      title: '确认重置密码？',
      content: (
        <>
          将重置用户 <strong>{row.username}</strong> 的登录密码。对方需使用<strong>原用户名</strong>
          在注册页设置新密码后才能登录。此操作不可撤销。
        </>
      ),
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => resetPassword.mutateAsync(row.id),
    });
  };

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      appMessage.success('用户已删除');
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'USER' });
    setOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    form.setFieldsValue({
      email: row.email ?? '',
      displayName: row.displayName ?? '',
      role: row.role,
      password: '',
    });
    setOpen(true);
  };

  const uploadHeaders = { Authorization: `Bearer ${getToken()}` };

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" onClick={openCreate}>
          新建用户
        </Button>
        <Upload
          action="/api/v1/users/import"
          headers={uploadHeaders}
          name="file"
          accept=".csv"
          showUploadList={false}
          onChange={(info) => {
            if (info.file.status === 'done') {
              appMessage.success('批量导入完成');
              void qc.invalidateQueries({ queryKey: ['admin-users'] });
            }
            if (info.file.status === 'error') {
              appMessage.error('导入失败');
            }
          }}
        >
          <Button>批量导入 CSV</Button>
        </Upload>
        <a href="/api/v1/templates/user-import.csv">下载模板</a>
      </Space>

      <Table
        loading={users.isLoading}
        dataSource={users.data ?? []}
        rowKey="id"
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '邮箱', dataIndex: 'email', render: (v) => v ?? '—' },
          { title: '昵称', dataIndex: 'displayName', render: (v) => v ?? '—' },
          { title: '角色', dataIndex: 'role' },
          {
            title: '操作',
            key: 'actions',
            width: 220,
            render: (_, row) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(row)}>
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => confirmResetPassword(row)}
                >
                  重置密码
                </Button>
                <Popconfirm
                  title="确定删除该用户？"
                  onConfirm={() => deleteUser.mutate(row.id)}
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
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={saveUser.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => saveUser.mutate(v)}
        >
          {!editing && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '至少 6 位' },
                ]}
              >
                <Input.Password />
              </Form.Item>
            </>
          )}
          {editing && (
            <Form.Item name="password" label="新密码（留空不修改）">
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="email" label="邮箱">
            <Input type="email" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="昵称"
            rules={[{ max: 64, message: '昵称最多 64 个字符' }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true }]}
          >
            <Select
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
