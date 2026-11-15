"use client";

import Script from "next/script";
import { leadOrigin, withLeadOrigin } from "./lib/lead-origin";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const measurementId = "G-CR6HCTPRES";
type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void };

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const privatePage = /^\/(admin|api|control|login)(\/|$)/.test(pathname);

  useEffect(() => {
    if (privatePage) return;
    leadOrigin();
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      const url = new URL(link.href, window.location.origin);
      if (url.hostname !== "wa.me" && url.hostname !== "api.whatsapp.com") return;
      const message = url.searchParams.get("text") || "Hola, quiero cotizar productos de Merly Import.";
      url.searchParams.set("text", withLeadOrigin(message));
      link.href = url.toString();
      if (link.classList.contains("header-whatsapp")) return;
      (window as AnalyticsWindow).gtag?.("event", "whatsapp_click", { placement: pathname, lead_source: leadOrigin() });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, privatePage]);

  if (privatePage) return null;
  return <>
    <Script id="merly-google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){window.dataLayer.push(arguments);};
      window.gtag("js", new Date());
      window.gtag("config", "${measurementId}", {allow_google_signals:false, allow_ad_personalization_signals:false});
    `}</Script>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
  </>;
}
