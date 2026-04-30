"use client";

type EventParams = Record<string, string | number | boolean | null | undefined>;
type UserProperties = Record<string, string | number | null | undefined>;

type GtagCommand = "event" | "set" | "config" | "js";

declare global {
  interface Window {
    gtag?: (...args: [GtagCommand | string, ...unknown[]]) => void;
  }
}

function hasGtag(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackEvent(eventName: string, params?: EventParams): void {
  if (!hasGtag()) return;
  window.gtag!("event", eventName, params ?? {});
}

export function setUserProperties(properties: UserProperties): void {
  if (!hasGtag()) return;
  window.gtag!("set", "user_properties", properties);
}
