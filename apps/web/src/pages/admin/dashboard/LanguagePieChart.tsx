import { Card } from 'antd';
import { Pie } from '@ant-design/charts';

interface LanguageDistribution {
  language: string;
  count: number;
}

interface LanguagePieChartProps {
  data: LanguageDistribution[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  JAVASCRIPT: 'JavaScript',
  C: 'C',
  CPP: 'C++',
  PYTHON: 'Python',
  JAVA: 'Java',
  GO: 'Go',
  RUST: 'Rust',
  KOTLIN: 'Kotlin',
};

export function LanguagePieChart({ data }: LanguagePieChartProps) {
  const chartData = data.map((d) => ({
    language: LANGUAGE_LABELS[d.language] ?? d.language,
    count: d.count,
  }));

  const config = {
    data: chartData,
    angleField: 'count',
    colorField: 'language',
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      text: (d: { language: string }) => d.language,
      style: { fontSize: 12 },
    },
    legend: { color: { position: 'bottom' as const } },
    tooltip: {
      title: (language: string) => language,
      formatter: (datum: { language: string; count: number }) => ({
        name: datum.language,
        value: `${datum.count} 次`,
      }),
    },
    height: 320,
    autoFit: true,
  };

  return (
    <Card title="语言分布">
      <Pie {...config} />
    </Card>
  );
}
