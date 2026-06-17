import { useQuery } from '@tanstack/react-query';
import { Button, Card, Tabs, Tag } from 'antd';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { MarkdownContent } from '../components/MarkdownContent';
import { DiscussionTab } from '../components/discussions/DiscussionTab';
import { RecommendationSection } from '../components/recommendations/RecommendationSection';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';
import { formatEntityId } from '../lib/format-entity-id';
import { formatMemoryKiB } from '../lib/format-memory';
import { resolveProblemAssetSrc } from '../lib/resolve-problem-asset-src';

export function ProblemDetailPage() {
  const { number } = useParams();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contestId');
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['problem', number, contestId],
    queryFn: () => {
      const q = contestId ? `?contestId=${encodeURIComponent(contestId)}` : '';
      return api<{
        number: number;
        title: string;
        statement: string;
        timeLimitMs: number;
        memoryLimitKb: number;
      }>(`/problems/${number}${q}`);
    },
    enabled: Boolean(number),
  });

  useBreadcrumbLabel(
    data ? `${formatEntityId(data.number)} ${data.title}` : number,
  );

  const submitQs = contestId
    ? `?contestId=${encodeURIComponent(contestId)}`
    : '';

  return (
    <>
      <Card
        loading={isLoading}
        title={
          data ? (
            <>
              <Tag style={{ marginRight: 8 }}>{formatEntityId(data.number)}</Tag>
              {data.title}
            </>
          ) : undefined
        }
        extra={
          <Link to={`/problems/${number}/submit${submitQs}`}>
            <Button type="primary">{t('problems.submit')}</Button>
          </Link>
        }
      >
        <Tabs
          defaultActiveKey="statement"
          items={[
            {
              key: 'statement',
              label: t('problems.statement'),
              children: (
                <>
                  <Tag>
                    {data?.timeLimitMs}ms / {data ? formatMemoryKiB(data.memoryLimitKb) : ''}
                  </Tag>
                  <MarkdownContent
                    content={data?.statement}
                    resolveAssetSrc={(src) =>
                      resolveProblemAssetSrc(number!, src, contestId) ?? src
                    }
                  />
                </>
              ),
            },
            {
              key: 'discussions',
              label: t('discussions.tab'),
              children: number ? <DiscussionTab problemNumber={Number(number)} /> : null,
            },
          ]}
        />
      </Card>
      <RecommendationSection limit={5} />
    </>
  );
}
