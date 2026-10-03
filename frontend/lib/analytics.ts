"use client";

// Google Analytics 4 helper. All calls no-op safely when NEXT_PUBLIC_GA_ID is
// not configured, so local/dev builds work without analytics.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled() {
  return !!GA_ID;
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

export { GA_ID };