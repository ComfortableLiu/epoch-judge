import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Space } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const DISMISSED_KEY = 'dismissed_announcements';

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissId(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const { data: announcements } = useQuery({
    queryKey: ['announcements-active'],
    queryFn: () => api<Announcement[]>('/announcements/active'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedIds);
  const [expanded, setExpanded] = useState(false);

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) {
    return null;
  }

  const displayed = expanded ? visible : visible.slice(0, 1);
  const hasMore = visible.length > 1;

  const handleDismiss = (id: string) => {
    dismissId(id);
    setDismissed(new Set(getDismissedIds()));
  };

  return (
    <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
      {displayed.map((a) => (
        <Alert
          key={a.id}
          type={a.isPinned ? 'warning' : 'info'}
          showIcon
          closable
          onClose={() => handleDismiss(a.id)}
          message={<strong>{a.isPinned ? '📌 ' : ''}{a.title}</strong>}
          description={a.content}
        />
      ))}
      {hasMore && (
        <Button
          type="link"
          size="small"
          onClick={() => setExpanded(!expanded)}
          style={{ padding: 0 }}
        >
          {expanded
            ? t('home.collapseAnnouncements')
            : t('home.showAllAnnouncements', { count: visible.length })}
        </Button>
      )}
    </Space>
  );
}
