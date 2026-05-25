import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'epoch.theme';

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

function applyDocumentTheme(resolved: 'light' | 'dark') {
  document.documentElement.dataset.theme = resolved;
}

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    const initial = resolve(readStoredMode());
    applyDocumentTheme(initial);
    return initial;
  });

  useEffect(() => {
    const next = resolve(mode);
    setResolved(next);
    applyDocumentTheme(next);
    localStorage.setItem(KEY, mode);

    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = resolve('system');
      setResolved(r);
      applyDocumentTheme(r);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(KEY, next);
    setModeState(next);
    const r = resolve(next);
    setResolved(r);
    applyDocumentTheme(r);
  };

  const value = useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return ctx;
}
