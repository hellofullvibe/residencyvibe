"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

export default function GAScript({ gaId }: { gaId?: string }) {
  const pathname = usePathname();

  // Make the id available to client-side track() calls.
  if (gaId) initAnalytics(gaId);

  // Send a page_view on every client-side route change.
  useEffect(() => {
    if (!gaId) return;
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("config", gaId, { page_path: pathname });
    }
  }, [pathname, gaId]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', '${gaId}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}