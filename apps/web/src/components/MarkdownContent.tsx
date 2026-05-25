import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as styles from './MarkdownContent.module.scss';

type Props = {
  content?: string | null;
  className?: string;
  /** 解析相对路径图片（如题目 assets/fig.png） */
  resolveAssetSrc?: (src: string) => string;
};

export function MarkdownContent({ content, className, resolveAssetSrc }: Props) {
  const components = useMemo(
    () => ({
      img: ({
        src,
        alt,
        title,
      }: {
        src?: string;
        alt?: string;
        title?: string;
      }) => {
        const resolved = src
          ? (resolveAssetSrc ? resolveAssetSrc(src) : src)
          : undefined;
        return (
          <img
            src={resolved}
            alt={alt ?? ''}
            title={title}
            loading="lazy"
            className={styles.image}
          />
        );
      },
    }),
    [resolveAssetSrc],
  );

  if (!content?.trim()) return null;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
