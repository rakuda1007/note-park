"use client";

import { useEffect, useState } from "react";
import NoteEditor from "@/components/NoteEditor";

export default function HomeClient() {
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    const bump = () => setSessionKey((k) => k + 1);
    window.addEventListener("note-park-pwa-resume", bump);
    return () => window.removeEventListener("note-park-pwa-resume", bump);
  }, []);

  return <NoteEditor key={sessionKey} mode="new" />;
}
