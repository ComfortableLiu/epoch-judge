import type { IconProps } from '@icon-park/react/lib/runtime';
import { Home, BookOpen, Trophy, List, Setting, User, Login, Logout, People, Bookmark } from '@icon-park/react';

const map = {
  home: Home,
  problems: BookOpen,
  contests: Trophy,
  submissions: List,
  settings: Setting,
  user: User,
  login: Login,
  logout: Logout,
  classes: People,
  homework: Bookmark,
} as const;

export type AppIconName = keyof typeof map;

export function AppIcon({
  name,
  ...props
}: { name: AppIconName } & Partial<IconProps>) {
  const Cmp = map[name];
  return <Cmp theme="outline" size="18" {...props} />;
}
