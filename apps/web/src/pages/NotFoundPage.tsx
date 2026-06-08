import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.message', '页面不存在')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('notFound.backHome', '返回首页')}
          </Button>
        }
      />
    </div>
  );
}
