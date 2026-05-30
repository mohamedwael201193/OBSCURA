import type { DocNavGroup } from "./types";

export const DOC_NAV: DocNavGroup[] = [
  {
    title: "Getting started",
    items: [
      { slug: "ecosystem", label: "Ecosystem overview" },
      { slug: "quick-start", label: "Quick start" },
      { slug: "first-app", label: "Build your first app" },
      { slug: "sdk-onboarding", label: "SDK onboarding" },
    ],
  },
  {
    title: "Platform",
    items: [
      { slug: "architecture", label: "Architecture" },
      { slug: "privacy", label: "Privacy model" },
    ],
  },
  {
    title: "Products",
    items: [
      { slug: "pay", label: "Obscura Pay" },
      { slug: "credit", label: "Obscura Credit" },
      { slug: "vote", label: "Obscura Vote" },
    ],
  },
  {
    title: "Shared services",
    items: [
      { slug: "reputation", label: "Reputation" },
      { slug: "activity", label: "Activity" },
      { slug: "notifications", label: "Notifications" },
    ],
  },
  {
    title: "Reference",
    items: [{ slug: "sdk", label: "SDK reference" }],
  },
];

export const DEFAULT_DOC_SLUG = "quick-start";

export const ALL_DOC_SLUGS = DOC_NAV.flatMap((g) => g.items.map((i) => i.slug));
