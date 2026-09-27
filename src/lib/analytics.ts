// Centralized Analytics Event Tracking Helper
// Tracks key funnel events across the e-commerce store

export type AnalyticsEvent =
  | "primary_cta_clicked"
  | "personalization_drawer_opened"
  | "low_dpi_warning_triggered"
  | "b2b_lead_form_submitted"
  | "add_to_cart"
  | "checkout_step_viewed"
  | "swatch_color_selected";

export function trackEvent(name: AnalyticsEvent, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const eventData = {
    event: name,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    ...payload,
  };

  // 1. Log in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`📊 [Analytics] ${name}:`, eventData);
  }

  // 2. Dispatch custom event for custom listeners
  try {
    window.dispatchEvent(new CustomEvent("tnp_analytics", { detail: eventData }));
  } catch {}

  // 3. Google Analytics / GTM dataLayer integration if present
  try {
    const win = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push(eventData);
    }
    if (typeof win.gtag === "function") {
      win.gtag("event", name, payload);
    }
  } catch {}
}
