"use client";

import { useEffect } from "react";
import {
  sendDailyHeartbeat,
  shouldAttemptMonthlyMigrationHeartbeat,
} from "@/lib/analytics/heartbeat";

/** 起動時に1日1回だけ匿名利用統計を送信する（メモ内容は含めない） */
export default function HeartbeatSender() {
  useEffect(() => {
    void sendDailyHeartbeat();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!shouldAttemptMonthlyMigrationHeartbeat()) return;
      void sendDailyHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
