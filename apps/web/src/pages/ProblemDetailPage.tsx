import { useQuery } from '@tanstack/react-query';
import { Button, Card, Tag } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { MarkdownContent } from '../components/MarkdownContent';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';
import { resolveProblemAssetSrc } from '../lib/resolve-problem-asset-src';

export function ProblemDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () =>
      api<{
        title: string;
        statement: string;
        timeLimitMs: number;
        memoryLimitKb: number;
        defaultJudgeMode: string;
      }>(`/problems/${slug}`),
    enabled: Boolean(slug),
  });

  useBreadcrumbLabel(data?.title ?? slug);

  return (
    <Card
      loading={isLoading}
      title={data?.title}
      extra={
        <Link to={`/problems/${slug}/submit`}>
          <Button type="primary">{t('problems.submit')}</Button>
        </Link>
      }
    >
      <Tag>
        {data?.timeLimitMs}ms / {data?.memoryLimitKb}KB
      </Tag>
      <Tag>{data?.defaultJudgeMode}</Tag>
      <MarkdownContent
        content={data?.statement}
        resolveAssetSrc={(src) => resolveProblemAssetSrc(slug!, src) ?? src}
      />
    </Card>
  );
}
