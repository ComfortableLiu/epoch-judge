import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions } from 'antd';
import { api } from '../api/client';

export function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () =>
      api<{
        username: string;
        email: string | null;
        displayName: string | null;
        role: string;
      }>('/users/me'),
  });

  return (
    <Card loading={isLoading}>
      <Descriptions column={1}>
        <Descriptions.Item label="Username">{data?.username}</Descriptions.Item>
        <Descriptions.Item label="Email">{data?.email}</Descriptions.Item>
        <Descriptions.Item label="Role">{data?.role}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
