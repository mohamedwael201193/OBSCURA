import { Link } from "react-router-dom";
import type { DocBlock } from "@docs/types";
import { DocCodeBlock } from "./DocCodeBlock";
import { DocVisual } from "./DocVisuals";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function DocContent({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="docs-portal-article">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return <p key={i}>{block.text}</p>;
          case "heading": {
            const id = block.id ?? slugify(block.text);
            if (block.level === 2) {
              return (
                <h2 key={i} id={id} className="docs-h2">
                  {block.text}
                </h2>
              );
            }
            return (
              <h3 key={i} id={id} className="docs-h3">
                {block.text}
              </h3>
            );
          }
          case "list":
            if (block.ordered) {
              return (
                <ol key={i} className="docs-portal-list list-decimal">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} className="docs-portal-list list-disc">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="docs-portal-table-wrap">
                <table className="docs-portal-table">
                  <thead>
                    <tr>
                      {block.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <DocCodeBlock
                key={i}
                code={block.code}
                title={block.title}
                language={block.language}
              />
            );
          case "callout":
            return (
              <div key={i} className="docs-portal-callout" data-variant={block.variant}>
                <div className="docs-portal-callout-title">{block.title}</div>
                <div className="docs-portal-callout-text">{block.text}</div>
              </div>
            );
          case "diagram":
            return (
              <div key={i} className="docs-portal-diagram docs-portal-diagram--legacy">
                <div className="docs-portal-diagram-title">{block.title}</div>
                <pre className="docs-portal-diagram-body">{block.mermaid}</pre>
              </div>
            );
          case "visual":
            return (
              <div key={i} className="docs-visual-wrap">
                <DocVisual variant={block.variant} />
              </div>
            );
          case "steps":
            return (
              <div key={i} className="docs-steps">
                {block.items.map((step, si) =>
                  step.href ? (
                    <Link key={step.title} to={step.href} className="docs-step docs-step--link">
                      <span className="docs-step-num">{si + 1}</span>
                      <span>
                        <span className="docs-step-title">{step.title}</span>
                        <span className="docs-step-desc">{step.description}</span>
                      </span>
                    </Link>
                  ) : (
                    <div key={step.title} className="docs-step">
                      <span className="docs-step-num">{si + 1}</span>
                      <span>
                        <span className="docs-step-title">{step.title}</span>
                        <span className="docs-step-desc">{step.description}</span>
                      </span>
                    </div>
                  ),
                )}
              </div>
            );
          case "scale":
            return (
              <div key={i} className="docs-scale-grid">
                {block.metrics.map((m) => (
                  <div key={m.label} className="docs-scale-card">
                    <div className="docs-scale-value">{m.value}</div>
                    <div className="docs-scale-label">{m.label}</div>
                    {m.detail ? <div className="docs-scale-detail">{m.detail}</div> : null}
                  </div>
                ))}
              </div>
            );
          case "cards":
            return (
              <div key={i} className="docs-portal-cards">
                {block.items.map((card) => {
                  const inner = (
                    <>
                      <div className="docs-portal-card-title">{card.title}</div>
                      <div className="docs-portal-card-desc">{card.description}</div>
                    </>
                  );
                  return card.href ? (
                    <Link key={card.title} to={card.href} className="docs-portal-card">
                      {inner}
                    </Link>
                  ) : (
                    <div key={card.title} className="docs-portal-card">
                      {inner}
                    </div>
                  );
                })}
              </div>
            );
          case "link-grid":
            return (
              <div key={i} className="docs-portal-link-grid">
                {block.items.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.description ? (
                      <span className="text-xs text-[rgba(24,40,14,0.55)] mt-0.5">{item.description}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
