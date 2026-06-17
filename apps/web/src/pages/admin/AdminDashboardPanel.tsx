import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { api } from '../../api/client';
import { MetricCards } from './dashboard/MetricCards';
import { SubmissionTrendChart } from './dashboard/SubmissionTrendChart';
import { PopularProblemsTable } from './dashboard/PopularProblemsTable';
import { LanguagePieChart } from './dashboard/LanguagePieChart';

export interface PlatformStats {
  dau: number;
  totalSubmissions: number;
  todaySubmissions: number;
  avgJudgeLatencyMs: number;
  onlineJudgeNodes: number;
  submissionTrend: { date: string; count: number }[];
  popularProblems: {
    problemId: string;
    number: number;
    title: string;
    submissionCount: number;
  }[];
  languageDistribution: { language: string; count: number }[];
  updatedAt: string;
}

export function AdminDashboardPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<PlatformStats>('/stats'),
    refetchInterval: 60_000, // refresh every minute
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <MetricCards stats={data} />
      <SubmissionTrendChart data={data.submissionTrend} />
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 500px' }}>
          <PopularProblemsTable data={data.popularProblems} />
        </div>
        <div style={{ flex: '1 1 360px' }}>
          <LanguagePieChart data={data.languageDistribution} />
        </div>
      </div>
    </div>
  );
}
