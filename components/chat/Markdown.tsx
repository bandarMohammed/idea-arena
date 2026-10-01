"use client";

import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/**
 * Markdown renderer for agent output.
 *
 * Security notes:
 * - `dangerouslySetInnerHTML` is never used anywhere in this app.
 * - `rehype-raw` is deliberately NOT installed, so any raw HTML inside the
 *   agent response is rendered as literal text rather than live markup.
 * - `urlTransform` whitelists safe protocols, blocking `javascript:` and
 *   `data:` URLs in links and images.
 * - Links open in a new tab with `noopener noreferrer`.
 */

const SAFE_PROTOCOL = /^(https?:|mailto:|tel:|#|\/)/i;

function urlTransform(url: string): string {
  const value = url.trim();
  if (!value) return "";
  return SAFE_PROTOCOL.test(value) ? value : "";
}

const components: Components = {
  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props}>
        {children}
      </a>
    );
  },
  code({ className, children, ...props }) {
    const text = String(children ?? "").replace(/\n$/, "");
    const match = /language-(\w+)/.exec(className ?? "");
    const isBlock = text.includes("\n") || !!match;

    if (!isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock code={text} language={match?.[1]} />;
  },
  // react-markdown wraps code blocks in <pre>; CodeBlock brings its own.
  pre({ children }) {
    return <>{children}</>;
  },
};

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
