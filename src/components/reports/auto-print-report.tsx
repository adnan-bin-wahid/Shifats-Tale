"use client";

import { useEffect } from "react";

export function AutoPrintReport() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
