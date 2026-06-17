import { Card, Col, Row, Statistic } from 'antd';
import {
  UserOutlined,
  SendOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type { PlatformStats } from '../AdminDashboardPanel';

interface MetricCardsProps {
  stats: PlatformStats;
}

export function MetricCards({ stats }: MetricCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="DAU（日活跃用户）"
            value={stats.dau}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="总提交量"
            value={stats.totalSubmissions}
            prefix={<SendOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="今日提交"
            value={stats.todaySubmissions}
            prefix={<SendOutlined />}
            valueStyle={{ color: '#3b82f6' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="平均判题延迟"
            value={stats.avgJudgeLatencyMs}
            suffix="ms"
            prefix={<ClockCircleOutlined />}
            valueStyle={
              stats.avgJudgeLatencyMs > 5000
                ? { color: '#ef4444' }
                : stats.avgJudgeLatencyMs > 2000
                  ? { color: '#f59e0b' }
                  : { color: '#22c55e' }
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="在线判题节点"
            value={stats.onlineJudgeNodes}
            prefix={<CloudServerOutlined />}
            valueStyle={
              stats.onlineJudgeNodes === 0
                ? { color: '#ef4444' }
                : { color: '#22c55e' }
            }
          />
        </Card>
      </Col>
    </Row>
  );
}
