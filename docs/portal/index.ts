import type { DocPage, DocSearchEntry } from "../types";
import { ecosystemPage, quickStartPage } from "./pages/getting-started";
import { firstAppPage, sdkOnboardingPage } from "./pages/onboarding";
import { architecturePage, privacyPage } from "./pages/platform";
import { payPage, creditPage, votePage } from "./pages/products";
import { reputationPage, activityPage, notificationsPage, sdkReferencePage } from "./pages/services";

export const DOC_PAGES: DocPage[] = [
  ecosystemPage,
  quickStartPage,
  firstAppPage,
  sdkOnboardingPage,
  architecturePage,
  privacyPage,
  payPage,
  creditPage,
  votePage,
  reputationPage,
  activityPage,
  notificationsPage,
  sdkReferencePage,
];

export const DOC_PAGES_BY_SLUG = Object.fromEntries(
  DOC_PAGES.map((p) => [p.slug, p]),
) as Record<string, DocPage>;

function blockText(block: DocPage["blocks"][number]): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "heading":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "table":
      return [...block.headers, ...block.rows.flat()].join(" ");
    case "code":
      return block.code;
    case "callout":
      return `${block.title} ${block.text}`;
    case "diagram":
      return `${block.title} ${block.mermaid}`;
    case "cards":
      return block.items.map((i) => `${i.title} ${i.description}`).join(" ");
    case "link-grid":
      return block.items.map((i) => `${i.label} ${i.description ?? ""}`).join(" ");
    case "visual":
      return block.variant;
    case "steps":
      return block.items.map((i) => `${i.title} ${i.description}`).join(" ");
    case "scale":
      return block.metrics.map((m) => `${m.label} ${m.value}`).join(" ");
    default:
      return "";
  }
}

export function buildSearchIndex(): DocSearchEntry[] {
  const home: DocSearchEntry = {
    slug: "home",
    title: "Developer Portal Overview",
    description: "Obscura docs home — Pay, Credit, Vote, SDK, architecture",
    category: "Getting started",
    excerpt: "Build privacy-first DeFi with Obscura on Arbitrum Sepolia",
  };
  return [
    home,
    ...DOC_PAGES.map((page) => ({
    slug: page.slug,
    title: page.title,
    description: page.description,
    category: page.category,
    excerpt: page.blocks
      .slice(0, 4)
      .map(blockText)
      .join(" ")
      .slice(0, 200),
    })),
  ];
}

export function getPage(slug: string): DocPage | undefined {
  return DOC_PAGES_BY_SLUG[slug];
}
