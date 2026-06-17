import Editor from '@monaco-editor/react';
import { useThemeMode } from '../hooks/useThemeMode';

const LANG_MAP: Record<string, string> = {
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
  JAVA: 'java',
  C: 'c',
  CPP: 'cpp',
  GO: 'go',
  RUST: 'rust',
  KOTLIN: 'kotlin',
};

export function CodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
}: {
  language: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  const { resolved } = useThemeMode();
  return (
    <Editor
      height="420px"
      language={LANG_MAP[language] ?? 'plaintext'}
      value={value}
      theme={resolved === 'dark' ? 'vs-dark' : 'light'}
      onChange={readOnly ? undefined : (v) => onChange?.(v ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
