"use client";

// Google Analytics 4 helper. The GA measurement id is passed in from the
// server (root layout reads process.env.GA_ID) rather than inlined into the
// client bundle, so it can be stored as an encrypted/config Vercel variable.
// All calls no-op safely when no id is configured.
let gaId = "";

export function initAnalytics(id: string) {
  gaId = id;
}

export function isAnalyticsEnabled() {
  return !!gaId;
}

export function track(eventName: string, params?: Record<string, unknown>) {
  if (!isAnalyticsEnabled()) return;
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
  } catch {
    // analytics must never break the app
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}