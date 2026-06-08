import { Card, Skeleton } from 'antd';

interface TableSkeletonProps {
  title?: string;
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ title, rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <Card title={title ? <Skeleton.Input active size="small" style={{ width: 120 }} /> : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton.Input
              key={i}
              active
              size="small"
              style={{ width: i === 0 ? 72 : i === 1 ? 200 : 100, flex: i === 1 ? 1 : undefined }}
            />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton.Button
                key={colIndex}
                active
                size="small"
                shape="default"
                style={{
                  width: colIndex === 0 ? 72 : colIndex === 1 ? 200 : 100,
                  height: 20,
                  flex: colIndex === 1 ? 1 : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
