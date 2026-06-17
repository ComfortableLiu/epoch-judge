import { Card } from 'antd';
import { Line } from '@ant-design/charts';

interface SubmissionTrendChartProps {
  data: { date: string; count: number }[];
}

export function SubmissionTrendChart({ data }: SubmissionTrendChartProps) {
  const config = {
    data,
    xField: 'date',
    yField: 'count',
    smooth: true,
    point: { size: 3 },
    xAxis: {
      label: {
        autoRotate: false,
        formatter: (v: string) => v.slice(5), // show MM-DD
      },
    },
    yAxis: {
      label: { formatter: (v: string) => `${v}` },
      min: 0,
    },
    tooltip: {
      title: (date: string) => date,
      formatter: (datum: { date: string; count: number }) => ({
        name: '提交量',
        value: datum.count,
      }),
    },
    area: {
      style: {
        fillOpacity: 0.15,
      },
    },
    height: 320,
    autoFit: true,
  };

  return (
    <Card title="最近 30 天提交趋势">
      <Line {...config} />
    </Card>
  );
}
