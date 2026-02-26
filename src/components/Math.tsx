"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

interface MathProps {
  expression: string;
  block?: boolean;
  className?: string;
}

export function Math({ expression, block = false, className }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return `<span style="color:red">Invalid LaTeX: ${expression}</span>`;
    }
  }, [expression, block]);

  if (block) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
