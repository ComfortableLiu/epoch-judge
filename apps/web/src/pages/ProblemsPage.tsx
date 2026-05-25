import { useQuery } from '@tanstack/react-query';
import { Card, List, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

interface ProblemRow {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  defaultJudgeMode: string;
}

export function ProblemsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: () => api<ProblemRow[]>('/problems'),
  });

  return (
    <Card title={t('problems.title')} loading={isLoading}>
      <List
        dataSource={data ?? []}
        renderItem={(p) => (
          <List.Item>
            <List.Item.Meta
              title={<Link to={`/problems/${p.slug}`}>{p.title}</Link>}
              description={
                <>
                  <Tag>{p.defaultJudgeMode}</Tag>
                  <Tag>难度 {p.difficulty}</Tag>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
