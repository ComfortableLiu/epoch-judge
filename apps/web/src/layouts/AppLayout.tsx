import { Layout, Menu, Button, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBreadcrumb } from '../components/AppBreadcrumb';
import { AppIcon } from '../components/AppIcon';
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext';
import { clearSessionAndRedirect, isTokenUsable, getToken } from '../api/client';
import { useThemeMode } from '../hooks/useThemeMode';
import * as styles from './AppLayout.module.scss';

const { Header, Content } = Layout;

export function AppLayout() {
  const { t } = useTranslation();
  const { resolved } = useThemeMode();
  const nav = useNavigate();
  const loc = useLocation();
  const loggedIn = isTokenUsable(getToken());
  const menuTheme = resolved === 'dark' ? 'dark' : 'light';

  const items = [
    { key: '/', label: t('nav.home'), icon: <AppIcon name="home" /> },
    { key: '/problems', label: t('nav.problems'), icon: <AppIcon name="problems" /> },
    { key: '/contests', label: t('nav.contests'), icon: <AppIcon name="contests" /> },
    ...(loggedIn
      ? [
          {
            key: '/submissions',
            label: t('nav.submissions'),
            icon: <AppIcon name="submissions" />,
          },
          {
            key: '/classes',
            label: t('nav.classes'),
            icon: <AppIcon name="classes" />,
          },
          {
            key: '/homework',
            label: t('nav.homework'),
            icon: <AppIcon name="homework" />,
          },
        ]
      : []),
    { key: '/settings', label: t('nav.settings'), icon: <AppIcon name="settings" /> },
    ...(loggedIn
      ? [{ key: '/admin', label: t('nav.admin'), icon: <AppIcon name="user" /> }]
      : []),
  ];

  return (
    <Layout className={styles.root}>
      <Header className={styles.header}>
        <Typography.Title level={4} className={styles.brand}>
          {t('brand')}
        </Typography.Title>
        <Menu
          mode="horizontal"
          theme={menuTheme}
          selectedKeys={[loc.pathname]}
          items={items}
          onClick={({ key }) => nav(key)}
          className={styles.menu}
        />
        <Space className={styles.headerActions}>
          {loggedIn ? (
            <>
              <Button type="link" onClick={() => nav('/profile')}>
                <AppIcon name="user" /> {t('nav.profile')}
              </Button>
              <Button
                type="link"
                onClick={() => clearSessionAndRedirect()}
              >
                <AppIcon name="logout" /> {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => nav('/login')}>
                <AppIcon name="login" /> {t('nav.login')}
              </Button>
              <Button type="primary" onClick={() => nav('/register')}>
                {t('nav.register')}
              </Button>
            </>
          )}
        </Space>
      </Header>
      <Content className={styles.content}>
        <BreadcrumbProvider key={loc.pathname}>
          <AppBreadcrumb />
          <Outlet />
        </BreadcrumbProvider>
      </Content>
    </Layout>
  );
}
