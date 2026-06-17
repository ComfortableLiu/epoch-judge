import { useQuery } from '@tanstack/react-query';
import { Card, List, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { formatEntityId } from '../../lib/format-entity-id';

const { Text } = Typography;

interface RecommendedProblem {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  tags: string[];
  reason: string;
}

interface RecommendationSectionProps {
  /** Max number of recommendations to show */
  limit?: number;
  /** Extra style for the Card wrapper */
  style?: React.CSSProperties;
}

export function RecommendationSection({ limit = 10, style }: RecommendationSectionProps) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', limit],
    queryFn: () => api<RecommendedProblem[]>(`/recommendations?limit=${limit}`),
    // Don't retry on 401 — user may just not be logged in
    retry: false,
    // Don't refetch on window focus to avoid stale flicker
    refetchOnWindowFocus: false,
  });

  // Don't render anything if not logged in or no data
  if (!isLoading && (!data || data.length === 0)) {
    return null;
  }

  return (
    <Card
      title={t('recommendations.title')}
      loading={isLoading}
      style={{ marginTop: 16, ...style }}
    >
      <List
        dataSource={data ?? []}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{ padding: '8px 0' }}
          >
            <List.Item.Meta
              title={
                <Link to={`/problems/${item.number}`}>
                  <Tag style={{ marginRight: 8 }}>{formatEntityId(item.number)}</Tag>
                  {item.title}
                </Link>
              }
              description={
                <span>
                  <Tag color="blue">{item.difficulty}</Tag>
                  {(item.tags ?? []).slice(0, 3).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {item.reason}
                  </Text>
                </span>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
