import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, List, Modal, Table, Tag, Typography } from 'antd';
import { appMessage } from '../lib/app-message';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getToken } from '../api/client';
import { formatEntityId } from '../lib/format-entity-id';
import { formatContestTitle } from '../lib/format-contest-title';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';

type ContestDetail = {
  id: string;
  number: number;
  title: string;
  description: string;
  judgeMode: string;
  startAt: string;
  endAt: string;
  freezeAt: string | null;
  requiresPassword?: boolean;
  accessGranted?: boolean;
  accessDeniedReason?: 'not_started' | 'password' | null;
  status?: 'upcoming' | 'running' | 'ended';
  canSubmit?: boolean;
  previewMode?: boolean;
  problems: { label: string; problem: { number: number; title: string } }[];
};

type ScoreboardRow = {
  userId: string;
  displayName: string;
  isStarTeam: boolean;
  rank: number | null;
  score?: number;
  solved?: number;
  penalty?: number;
};

export function ContestDetailPage() {
  const { number } = useParams();
  const { t } = useTranslation();
  const loggedIn = Boolean(getToken());
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [pwdOpen, setPwdOpen] = useState(false);

  const { data: contest, isLoading, refetch } = useQuery({
    queryKey: ['contest', number],
    queryFn: () => api<ContestDetail>(`/contests/${number}`),
    enabled: Boolean(number),
  });

  const accessGranted = contest?.accessGranted !== false;
  const notStartedBlocked = contest?.accessDeniedReason === 'not_started';
  const needsPassword = contest?.accessDeniedReason === 'password';
  const previewMode = Boolean(contest?.previewMode);
  const canSubmit = Boolean(contest?.canSubmit);

  const verifyPassword = useMutation({
    mutationFn: () =>
      api(`/contests/${number}/verify-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      appMessage.success(t('contests.passwordVerified'));
      setPwdOpen(false);
      setPassword('');
      void refetch();
      void qc.invalidateQueries({ queryKey: ['contest', number] });
    },
    onError: (e: Error) => appMessage.error(e.message),
  });

  const { data: scoreboard } = useQuery({
    queryKey: ['contest-scoreboard', number],
    queryFn: () => api<ScoreboardRow[]>(`/contests/${number}/scoreboard`),
    enabled: Boolean(number) && accessGranted,
    refetchInterval: 10000,
  });

  const officialRows = (scoreboard ?? []).filter((r) => !r.isStarTeam);
  const starRows = (scoreboard ?? []).filter((r) => r.isStarTeam);

  const displayTitle = contest
    ? formatContestTitle(contest.title, contest.requiresPassword)
    : number
      ? `#${number}`
      : undefined;
  useBreadcrumbLabel(displayTitle);

  const scoreColumns =
    contest?.judgeMode === 'OI'
      ? [{ title: t('contests.score'), dataIndex: 'score' as const }]
      : [
          { title: t('contests.solved'), dataIndex: 'solved' as const },
          { title: t('contests.penalty'), dataIndex: 'penalty' as const },
        ];

  return (
    <div>
      {notStartedBlocked && (
        <Card style={{ marginBottom: 16 }}>
          <Typography.Paragraph>{t('contests.notStartedBlocked')}</Typography.Paragraph>
          {contest?.startAt && (
            <Typography.Text type="secondary">
              {t('contests.colStart')}: {new Date(contest.startAt).toLocaleString()}
            </Typography.Text>
          )}
          {!loggedIn && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {t('contests.notStartedLoginHint')}
            </Typography.Paragraph>
          )}
        </Card>
      )}

      {needsPassword && (
        <Card style={{ marginBottom: 16 }}>
          <Typography.Paragraph>{t('contests.passwordBlocked')}</Typography.Paragraph>
          {loggedIn ? (
            <Button type="primary" onClick={() => setPwdOpen(true)}>
              {t('contests.enterPassword')}
            </Button>
          ) : (
            <Typography.Text type="secondary">{t('contests.passwordLoginHint')}</Typography.Text>
          )}
        </Card>
      )}

      <Modal
        title={t('contests.contestPassword')}
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        onOk={() => verifyPassword.mutate()}
        confirmLoading={verifyPassword.isPending}
        okText={t('common.confirm')}
      >
        <Input.Password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('contests.enterPasswordPlaceholder')}
          autoComplete="current-password"
        />
      </Modal>

      <Card
        loading={isLoading}
        title={
          contest
            ? formatContestTitle(contest.title, contest.requiresPassword)
            : t('contests.contestNumber', { number })
        }
      >
        {contest?.number != null && (
          <Tag style={{ marginBottom: 8 }}>ID #{contest.number}</Tag>
        )}
        <Tag>{contest?.judgeMode}</Tag>
        {accessGranted && (
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {contest?.description}
          </Typography.Paragraph>
        )}
        {previewMode && (
          <Typography.Paragraph type="warning" style={{ marginTop: 8 }}>
            {t('contests.previewModeHint')}
          </Typography.Paragraph>
        )}
        {contest?.freezeAt && accessGranted && (
          <Typography.Text type="secondary">
            {t('contests.freeze')}: {new Date(contest.freezeAt).toLocaleString()}
          </Typography.Text>
        )}
      </Card>

      {accessGranted && (
        <>
          <Card title={t('nav.problems')} style={{ marginTop: 16 }}>
            <List
              dataSource={contest?.problems ?? []}
              renderItem={(p) => (
                <List.Item>
                  <Tag>{p.label}</Tag>
                  <Tag style={{ marginRight: 4 }}>{formatEntityId(p.problem.number)}</Tag>
                  <Link
                    to={`/problems/${p.problem.number}?contestId=${contest?.number ?? number}`}
                  >
                    {p.problem.title}
                  </Link>
                  {canSubmit && (
                    <>
                      {' · '}
                      <Link
                        to={`/problems/${p.problem.number}/submit?contestId=${contest?.number ?? number}`}
                      >
                        {t('problems.submit')}
                      </Link>
                    </>
                  )}
                </List.Item>
              )}
            />
          </Card>

          <Card title={t('contests.officialRanking')} style={{ marginTop: 16 }}>
            <Table<ScoreboardRow>
              dataSource={officialRows}
              rowKey="userId"
              pagination={false}
              columns={[
                { title: '#', dataIndex: 'rank', width: 56 },
                { title: t('contests.participant'), dataIndex: 'displayName' },
                ...scoreColumns,
              ]}
            />
          </Card>

          {starRows.length > 0 && (
            <Card title={t('contests.starTeams')} style={{ marginTop: 16 }}>
              <Table<ScoreboardRow>
                dataSource={starRows}
                rowKey="userId"
                pagination={false}
                columns={[{ title: t('contests.participant'), dataIndex: 'displayName' }]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
