import { useTranslation } from 'react-i18next';
import { TableSkeleton } from './TableSkeleton';

export function ProblemListSkeleton() {
  const { t } = useTranslation();
  return (
    <TableSkeleton
      title={t('problems.title')}
      rows={10}
      columns={4}
    />
  );
}
