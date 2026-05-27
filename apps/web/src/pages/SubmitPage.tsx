import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Select } from 'antd';
import { appMessage } from '../lib/app-message';
import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { CodeEditor } from '../components/CodeEditor';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';

const LANGS = ['JAVASCRIPT', 'PYTHON', 'JAVA', 'C', 'CPP'] as const;
const TEMPLATES: Record<string, string> = {
  JAVASCRIPT:
    'import fs from "node:fs";\nconst [a, b] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n',
  PYTHON: 'a, b = map(int, input().split())\nprint(a + b)\n',
  JAVA: `import java.util.*;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    System.out.println(sc.nextInt() + sc.nextInt());
  }
}
`,
  C: '#include <stdio.h>\nint main() { int a,b; if(scanf("%d %d",&a,&b)==2) printf("%d\\n", a+b); return 0; }\n',
  CPP: '#include <iostream>\nusing namespace std;\nint main() { int a,b; cin>>a>>b; cout<<a+b<<endl; return 0; }\n',
};

type SubmitContext = {
  problemId: string;
  title: string;
  judgeMode: string;
  judgeModeLocked: boolean;
  language: string;
  contest?: { id: string; title: string; judgeMode: string };
};

export function SubmitPage() {
  const { number } = useParams();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contestId') ?? undefined;
  const nav = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const ctx = useQuery({
    queryKey: ['submit-context', number, contestId],
    queryFn: () => {
      const q = contestId ? `?contestId=${encodeURIComponent(contestId)}` : '';
      return api<SubmitContext>(`/problems/${number}/submit-context${q}`);
    },
    enabled: Boolean(number),
  });

  useBreadcrumbLabel(ctx.data?.title ?? (number ? `#${number}` : undefined));

  useEffect(() => {
    if (!ctx.data) return;
    const lang = ctx.data.language;
    form.setFieldsValue({
      language: lang,
      judgeMode: ctx.data.judgeMode,
      sourceCode: TEMPLATES[lang] ?? TEMPLATES.PYTHON,
    });
  }, [ctx.data, form]);

  const mutate = useMutation({
    mutationFn: (body: {
      problemId: string;
      language: string;
      judgeMode: string;
      sourceCode: string;
      contestId?: string;
    }) =>
      api<{ number: number }>('/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => nav(`/submissions/${res.number}`),
    onError: (e) => appMessage.error(e instanceof Error ? e.message : 'Error'),
  });

  const language = Form.useWatch('language', form) ?? 'PYTHON';
  const sourceCode = Form.useWatch('sourceCode', form) ?? TEMPLATES.PYTHON;
  const locked = ctx.data?.judgeModeLocked ?? false;

  return (
    <Card
      title={ctx.data?.title ?? (number ? `Submit — #${number}` : 'Submit')}
      loading={ctx.isLoading}
    >
      {ctx.data?.contest && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('submit.contestMode', {
            title: ctx.data.contest.title,
            mode: ctx.data.contest.judgeMode,
          })}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          language: 'PYTHON',
          judgeMode: 'ACM',
          sourceCode: TEMPLATES.PYTHON,
        }}
        onFinish={(v) =>
          mutate.mutate({
            problemId: ctx.data!.problemId,
            language: v.language,
            judgeMode: v.judgeMode,
            sourceCode: v.sourceCode,
            contestId,
          })
        }
      >
        <Form.Item name="language" label={t('submit.language')}>
          <Select
            options={LANGS.map((l) => ({ value: l, label: l }))}
            onChange={(l) => form.setFieldValue('sourceCode', TEMPLATES[l] ?? '')}
          />
        </Form.Item>
        <Form.Item
          name="judgeMode"
          label={t('submit.judgeMode')}
          extra={locked ? t('submit.judgeModeLocked') : undefined}
        >
          <Select
            disabled={locked}
            options={[
              { value: 'ACM', label: 'ACM' },
              { value: 'OI', label: 'OI' },
            ]}
          />
        </Form.Item>
        <Form.Item name="sourceCode" label={t('submit.code')} rules={[{ required: true }]}>
          <CodeEditor
            language={language}
            value={sourceCode}
            onChange={(v) => form.setFieldValue('sourceCode', v)}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutate.isPending}>
          {t('problems.submit')}
        </Button>
      </Form>
    </Card>
  );
}
