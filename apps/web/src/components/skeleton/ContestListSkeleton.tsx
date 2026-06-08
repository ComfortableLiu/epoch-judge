import { useTranslation } from 'react-i18next';
import { TableSkeleton } from './TableSkeleton';

export function ContestListSkeleton() {
  const { t } = useTranslation();
  return (
    <TableSkeleton
      title={t('contests.title')}
      rows={5}
      columns={8}
    />
  );
}
