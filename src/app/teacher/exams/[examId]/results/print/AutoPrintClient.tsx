"use client";

import { useEffect } from "react";

export function AutoPrintClient() {
  useEffect(() => {
    // Wait slightly to ensure all styles, table borders, and fonts are completely rendered
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
