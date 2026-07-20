import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";

type ReadmeMarkdownProps = {
  content: string;
  /** Owner/repo and git ref used to resolve relative links and images. */
  repoFullName: string | null;
  gitRef: string;
};

/**
 * Readmes come from arbitrary hackathon repositories, so raw HTML is dropped
 * (rehype-sanitize) rather than trusted, and relative links are rewritten
 * against the ref GitHub served the readme from.
 */
export function ReadmeMarkdown({
  content,
  repoFullName,
  gitRef,
}: ReadmeMarkdownProps) {
  const resolve = (url: string | undefined, raw: boolean) => {
    if (!url) return url;
    if (!repoFullName || /^(https?:|mailto:|#|data:)/i.test(url)) return url;
    const path = url.replace(/^\.?\//, "");
    const base = raw
      ? `https://raw.githubusercontent.com/${repoFullName}/${gitRef}/`
      : `https://github.com/${repoFullName}/blob/${gitRef}/`;
    return `${base}${path}`;
  };

  return (
    <div className="readme">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, ...props }) => (
            <a {...props} href={resolve(href, false)} target="_blank" rel="noreferrer" />
          ),
          // Readme images point at arbitrary external hosts (badges, raw
          // GitHub content), which next/image cannot be configured for.
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              src={resolve(typeof src === "string" ? src : undefined, true)}
              alt={alt ?? ""}
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
