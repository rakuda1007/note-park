"use client";

import { useEffect } from "react";
import { sendDailyHeartbeat } from "@/lib/analytics/heartbeat";

/** 起動時に1日1回だけ匿名利用統計を送信する（メモ内容は含めない） */
export default function HeartbeatSender() {
  useEffect(() => {
    void sendDailyHeartbeat();
  }, []);

  return null;
}
