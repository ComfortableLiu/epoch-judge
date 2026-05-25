import { Breadcrumb } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbContext } from '../contexts/BreadcrumbContext';
import { buildBreadcrumbItems } from '../lib/build-breadcrumb-items';
import * as styles from './AppBreadcrumb.module.scss';

export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { dynamicTitle } = useBreadcrumbContext();

  const items = useMemo(
    () => buildBreadcrumbItems(pathname, t, dynamicTitle),
    [pathname, t, dynamicTitle],
  );

  if (items.length === 0) return null;

  return (
    <Breadcrumb
      className={styles.root}
      items={items}
    />
  );
}
