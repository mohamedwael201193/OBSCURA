import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

interface DocCodeBlockProps {
  code: string;
  title?: string;
  language?: string;
}

export function DocCodeBlock({ code, title, language }: DocCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="docs-code-block">
      <div className="docs-code-block-header">
        <div className="docs-code-block-meta">
          {title ? <span className="docs-code-block-title">{title}</span> : null}
          {language ? <span className="docs-code-block-lang">{language}</span> : null}
        </div>
        <button
          type="button"
          className="docs-code-copy"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="docs-portal-code">
        <code>{code}</code>
      </pre>
    </div>
  );
}
