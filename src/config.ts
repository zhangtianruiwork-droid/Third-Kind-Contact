export interface SiteConfig {
  language: string;
  brandName: string;
  copyright: string;
}

export interface NavigationConfig {
  infoLinkLabel: string;
}

export interface SoulProfile {
  id: string;
  name: string;
  title: string;
  era: string;
  src: string;
  category: string;
  description: string;
  coreTraits: string[];
  methodology: string[];
  dialogueProtocol: string[];
  mentalModel: string[];
  quotes: string[];
}

export interface OverlayConfig {
  frameDetailLabel: string;
  fileLabel: string;
  seriesLabel: string;
  closeLabel: string;
}

export interface GalleryConfig {
  images: SoulProfile[];
}

export interface InfoPageConfig {
  backLinkLabel: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  contactLabel: string;
  contactEntries: { label: string; value: string; href?: string }[];
}

export const siteConfig: SiteConfig = {
  language: "zh-CN",
  brandName: "Third Kind Contact",
  copyright: "(c) 2026 Third Kind Contact",
};

export const navigationConfig: NavigationConfig = {
  infoLinkLabel: "About",
};

export const overlayConfig: OverlayConfig = {
  frameDetailLabel: "Soul Archive",
  fileLabel: "File",
  seriesLabel: "Category",
  closeLabel: "Close",
};

export const infoPageConfig: InfoPageConfig = {
  backLinkLabel: "Back",
  eyebrow: "System Manifesto",
  title: "Create AI companions from your own corpus,\nthen bring them into a desktop stage.",
  paragraphs: [
    "Third Kind Contact is a clean, local-first template for building AI companions from user-provided character material.",
    "The app helps turn a name, biography, corpus, methodology and speaking style into a structured soul profile for long-form conversation.",
    "This public version contains no API keys, no private localStorage export, and no cloned character data. Bring your own model keys and create your own companions.",
    "Desktop-stage features are powered by Tauri, React and optional video generation integrations.",
  ],
  contactLabel: "System Status",
  contactEntries: [
    { label: "Version", value: "0.1.0-clean" },
    { label: "Bundled characters", value: "0" },
    { label: "Privacy", value: "No bundled keys or cloned role data" },
    { label: "Runtime", value: "Tauri + React" },
  ],
};

export const galleryConfig: GalleryConfig = {
  images: [],
};
