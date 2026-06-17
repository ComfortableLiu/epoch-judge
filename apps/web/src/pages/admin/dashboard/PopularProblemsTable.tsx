import { Card, Table, Tag } from 'antd';

interface PopularProblem {
  problemId: string;
  number: number;
  title: string;
  submissionCount: number;
}

interface PopularProblemsTableProps {
  data: PopularProblem[];
}

export function PopularProblemsTable({ data }: PopularProblemsTableProps) {
  return (
    <Card title="热门题目 Top 10">
      <Table
        dataSource={data}
        rowKey="problemId"
        pagination={false}
        size="small"
        columns={[
          {
            title: '#',
            key: 'rank',
            width: 50,
            render: (_, __, index) => (
              <Tag color={index < 3 ? 'gold' : 'default'}>{index + 1}</Tag>
            ),
          },
          {
            title: '题号',
            dataIndex: 'number',
            width: 80,
            render: (num: number) => <Tag>{num}</Tag>,
          },
          {
            title: '标题',
            dataIndex: 'title',
            ellipsis: true,
          },
          {
            title: '提交量',
            dataIndex: 'submissionCount',
            width: 100,
            sorter: (a: PopularProblem, b: PopularProblem) =>
              a.submissionCount - b.submissionCount,
            defaultSortOrder: 'descend',
          },
        ]}
      />
    </Card>
  );
}
