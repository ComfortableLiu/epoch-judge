import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Form, Select, message } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { CodeEditor } from '../components/CodeEditor';
import { useBreadcrumbLabel } from '../contexts/BreadcrumbContext';

const LANGS = ['JAVASCRIPT', 'PYTHON', 'JAVA', 'C', 'CPP'] as const;
const TEMPLATES: Record<string, string> = {
  JAVASCRIPT: '// JavaScript (stdin via wrapper in production)\nlet s="";\nprocess.stdin.on("data",d=>s+=d);\nprocess.stdin.on("end",()=>console.log(s.trim().split(/\\s+/).join(" ")));\n',
  PYTHON: 'import sys\ninput = sys.stdin.read().split()\nprint(" ".join(input))\n',
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

export function SubmitPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [form] = Form.useForm();
  const { data: problem } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () =>
      api<{ id: string; title?: string; defaultJudgeMode?: string }>(`/problems/${slug}`),
    enabled: Boolean(slug),
  });

  useBreadcrumbLabel(problem?.title ?? slug);

  useEffect(() => {
    if (problem?.defaultJudgeMode) {
      form.setFieldValue('judgeMode', problem.defaultJudgeMode);
    }
  }, [problem, form]);

  const mutate = useMutation({
    mutationFn: (body: unknown) =>
      api<{ id: string }>('/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => nav(`/submissions/${res.id}`),
    onError: (e) => message.error(e instanceof Error ? e.message : 'Error'),
  });

  const language = Form.useWatch('language', form) ?? 'PYTHON';
  const sourceCode = Form.useWatch('sourceCode', form) ?? TEMPLATES.PYTHON;

  return (
    <Card title={`Submit — ${slug}`}>
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
            problemId: problem?.id,
            language: v.language,
            judgeMode: v.judgeMode,
            sourceCode: v.sourceCode,
          })
        }
      >
        <Form.Item name="language" label="Language">
          <Select
            options={LANGS.map((l) => ({ value: l, label: l }))}
            onChange={(l) => form.setFieldValue('sourceCode', TEMPLATES[l] ?? '')}
          />
        </Form.Item>
        <Form.Item name="judgeMode" label="Mode">
          <Select
            options={[
              { value: 'ACM', label: 'ACM' },
              { value: 'OI', label: 'OI' },
            ]}
          />
        </Form.Item>
        <Form.Item name="sourceCode" label="Code" rules={[{ required: true }]}>
          <CodeEditor
            language={language}
            value={sourceCode}
            onChange={(v) => form.setFieldValue('sourceCode', v)}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutate.isPending}>
          Submit
        </Button>
      </Form>
    </Card>
  );
}
