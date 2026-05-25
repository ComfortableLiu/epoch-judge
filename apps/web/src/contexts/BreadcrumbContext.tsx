import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type BreadcrumbContextValue = {
  dynamicTitle?: string;
  setDynamicTitle: (title: string | undefined) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: PropsWithChildren) {
  const [dynamicTitle, setDynamicTitleState] = useState<string | undefined>();

  const setDynamicTitle = useCallback((title: string | undefined) => {
    setDynamicTitleState(title);
  }, []);

  const value = useMemo(
    () => ({ dynamicTitle, setDynamicTitle }),
    [dynamicTitle, setDynamicTitle],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  }
  return ctx;
}

/** 详情页加载后设置当前段标题（题目标题、比赛名等） */
export function useBreadcrumbLabel(title: string | undefined) {
  const { setDynamicTitle } = useBreadcrumbContext();

  useEffect(() => {
    const label = title?.trim() || undefined;
    setDynamicTitle(label);
    return () => setDynamicTitle(undefined);
  }, [title, setDynamicTitle]);
}
