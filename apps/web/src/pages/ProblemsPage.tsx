import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useEffect, type ReactNode, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';
import { ProblemListSkeleton } from '../components/skeleton';
import { ProblemFilters, type ProblemFilterValues } from '../components/ProblemFilters';
import { RecommendationSection } from '../components/recommendations/RecommendationSection';

type PassStatus = 'PASSED' | 'FAILED' | 'NONE' | null;

interface ProblemRow {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  tags: string[];
  passStatus: PassStatus;
}

function passStatusTag(
  status: PassStatus,
  t: (key: string) => string,
): ReactNode {
  if (status === null) {
    return <Tag>{t('problems.passUnknown')}</Tag>;
  }
  if (status === 'PASSED') {
    return <Tag color="success">{t('problems.passPassed')}</Tag>;
  }
  if (status === 'FAILED') {
    return <Tag color="warning">{t('problems.passFailed')}</Tag>;
  }
  return <Tag>{t('problems.passNone')}</Tag>;
}

const DIFFICULTY_MIN = 0;
const DIFFICULTY_MAX = 5000;

function parseFiltersFromParams(params: URLSearchParams): ProblemFilterValues {
  const keyword = params.get('keyword') ?? '';
  const tags = params.get('tags') ? params.get('tags')!.split(',').filter(Boolean) : [];
  const difficultyMin = params.has('difficultyMin') ? Number(params.get('difficultyMin')) : DIFFICULTY_MIN;
  const difficultyMax = params.has('difficultyMax') ? Number(params.get('difficultyMax')) : DIFFICULTY_MAX;
  return { keyword, tags, difficultyRange: [difficultyMin, difficultyMax] };
}

function filtersToParams(filters: ProblemFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.difficultyRange[0] !== DIFFICULTY_MIN) params.set('difficultyMin', String(filters.difficultyRange[0]));
  if (filters.difficultyRange[1] !== DIFFICULTY_MAX) params.set('difficultyMax', String(filters.difficultyRange[1]));
  return params;
}

export function ProblemsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProblemFilterValues>(() => parseFiltersFromParams(searchParams));

  // Collect all unique tags from data for the tag selector
  const [allTags, setAllTags] = useState<string[]>([]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.keyword) p.set('keyword', filters.keyword);
    if (filters.tags.length > 0) p.set('tags', filters.tags.join(','));
    if (filters.difficultyRange[0] !== DIFFICULTY_MIN) p.set('difficultyMin', String(filters.difficultyRange[0]));
    if (filters.difficultyRange[1] !== DIFFICULTY_MAX) p.set('difficultyMax', String(filters.difficultyRange[1]));
    return p.toString();
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['problems', queryParams],
    queryFn: () => api<ProblemRow[]>(`/problems?${queryParams}`),
    placeholderData: keepPreviousData,
  });

  // Update allTags when data changes
  useEffect(() => {
    if (data) {
      const tags = new Set<string>();
      for (const row of data) {
        for (const tag of row.tags ?? []) {
          tags.add(tag);
        }
      }
      setAllTags((prev) => {
        const merged = new Set([...prev, ...tags]);
        return Array.from(merged).sort();
      });
    }
  }, [data]);

  const handleFiltersChange = useCallback((newFilters: ProblemFilterValues) => {
    setFilters(newFilters);
    setSearchParams(filtersToParams(newFilters), { replace: true });
  }, [setSearchParams]);

  const columns: ColumnsType<ProblemRow> = useMemo(
    () => [
      {
        title: t('problems.colId'),
        dataIndex: 'number',
        key: 'number',
        width: 72,
        render: (n: number) => (
          <Link to={`/problems/${n}`}>{formatEntityId(n)}</Link>
        ),
      },
      {
        title: t('problems.colTitle'),
        key: 'title',
        render: (_, row) => (
          <Link to={`/problems/${row.number}`}>{row.title}</Link>
        ),
      },
      {
        title: t('problems.colTags'),
        key: 'tags',
        width: 200,
        render: (_, row) => (
          <span>
            {(row.tags ?? []).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </span>
        ),
      },
      {
        title: t('problems.colPass'),
        dataIndex: 'passStatus',
        key: 'passStatus',
        width: 120,
        render: (status: PassStatus) => passStatusTag(status, t),
      },
      {
        title: t('problems.colDifficulty'),
        dataIndex: 'difficulty',
        key: 'difficulty',
        width: 88,
        render: (d: number) => <Tag>{d}</Tag>,
      },
    ],
    [t],
  );

  if (isLoading && !data) {
    return <ProblemListSkeleton />;
  }

  return (
    <>
      <RecommendationSection limit={5} />
      <Card title={t('problems.title')} style={{ marginTop: 16 }}>
        <ProblemFilters
          values={filters}
          onChange={handleFiltersChange}
          availableTags={allTags}
        />
        <Table<ProblemRow>
          dataSource={data ?? []}
          rowKey="id"
          columns={columns}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </>
  );
}
