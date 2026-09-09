"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { SHELL_HTML } from "@/lib/shell";
import { mountIppoApp } from "@/lib/appEngine";
import type { TractRecord } from "@/lib/types";

export default function IppoApp({ initialRecords }: { initialRecords: TractRecord[] }) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const cleanup = mountIppoApp(initialRecords);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />;
}
