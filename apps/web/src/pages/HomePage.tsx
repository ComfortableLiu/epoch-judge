import { Typography, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { AnnouncementBanner } from '../components/AnnouncementBanner';

export function HomePage() {
  const { t } = useTranslation();
  return (
    <>
      <AnnouncementBanner />
      <Card>
        <Typography.Title level={2}>{t('home.title')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('home.subtitle')}</Typography.Paragraph>
      </Card>
    </>
  );
}
