import { useTranslation } from 'react-i18next';
import { TableSkeleton } from './TableSkeleton';

export function SubmissionListSkeleton() {
  const { t } = useTranslation();
  return (
    <TableSkeleton
      title={t('submissions.title')}
      rows={10}
      columns={7}
    />
  );
}
