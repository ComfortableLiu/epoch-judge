import type { TFunction } from 'i18next';
import { Link, matchPath } from 'react-router-dom';

export type BreadcrumbItem = {
  key: string;
  title: React.ReactNode;
};

type RouteBuilder = (
  params: Record<string, string | undefined>,
  dynamicTitle: string | undefined,
  t: TFunction,
) => BreadcrumbItem[];

const ROUTES: { pattern: string; build: RouteBuilder }[] = [
  {
    pattern: '/problems/:number/submit',
    build: (p, dynamic, t) => {
      const num = p.number!;
      const problemLabel = dynamic ?? `#${num}`;
      return [
        { key: 'problems', title: <Link to="/problems">{t('nav.problems')}</Link> },
        {
          key: 'problem',
          title: <Link to={`/problems/${num}`}>{problemLabel}</Link>,
        },
        { key: 'submit', title: t('problems.submit') },
      ];
    },
  },
  {
    pattern: '/problems/:number',
    build: (p, dynamic, t) => {
      const num = p.number!;
      const label = dynamic ?? `#${num}`;
      return [
        { key: 'problems', title: <Link to="/problems">{t('nav.problems')}</Link> },
        {
          key: 'problem',
          title: <Link to={`/problems/${num}`}>{label}</Link>,
        },
      ];
    },
  },
  {
    pattern: '/submissions/:number',
    build: (p, dynamic, t) => [
      { key: 'submissions', title: <Link to="/submissions">{t('nav.submissions')}</Link> },
      { key: 'submission', title: dynamic ?? `#${p.number}` },
    ],
  },
  {
    pattern: '/contests/:number',
    build: (p, dynamic, t) => [
      { key: 'contests', title: <Link to="/contests">{t('nav.contests')}</Link> },
      { key: 'contest', title: dynamic ?? `#${p.number}` },
    ],
  },
  { pattern: '/problems', build: (_, __, t) => [{ key: 'problems', title: t('nav.problems') }] },
  { pattern: '/contests', build: (_, __, t) => [{ key: 'contests', title: t('nav.contests') }] },
  {
    pattern: '/submissions',
    build: (_, __, t) => [{ key: 'submissions', title: t('nav.submissions') }],
  },
  { pattern: '/settings', build: (_, __, t) => [{ key: 'settings', title: t('settings.title') }] },
  { pattern: '/admin', build: (_, __, t) => [{ key: 'admin', title: t('nav.admin') }] },
  { pattern: '/profile', build: (_, __, t) => [{ key: 'profile', title: t('nav.profile') }] },
  { pattern: '/admin', build: (_, __, t) => [{ key: 'admin', title: t('nav.admin') }] },
  { pattern: '/login', build: (_, __, t) => [{ key: 'login', title: t('nav.login') }] },
  { pattern: '/register', build: (_, __, t) => [{ key: 'register', title: t('nav.register') }] },
];

export function buildBreadcrumbItems(
  pathname: string,
  t: TFunction,
  dynamicTitle?: string,
): BreadcrumbItem[] {
  if (pathname === '/') return [];

  const home: BreadcrumbItem = {
    key: 'home',
    title: <Link to="/">{t('nav.home')}</Link>,
  };

  for (const { pattern, build } of ROUTES) {
    const match = matchPath({ path: pattern, end: true }, pathname);
    if (!match) continue;
    return [home, ...build(match.params, dynamicTitle, t)];
  }

  return [home];
}
