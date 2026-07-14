"use client";

import React, { useEffect, useState } from "react";
import { SiteLoader } from "./SiteLoader";

export function InitialSplashLoader() {
  const [show, setShow] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Check if splash screen was already shown in this specific page load
    const isFirstMount = !sessionStorage.getItem("shifat_splash_shown_session");
    
    if (isFirstMount) {
      setShow(true);
      sessionStorage.setItem("shifat_splash_shown_session", "1");

      const dismissTimer = setTimeout(() => {
        setIsDismissing(true);
      }, 1400);

      const unmountTimer = setTimeout(() => {
        setShow(false);
      }, 2100);

      return () => {
        clearTimeout(dismissTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, []);

  if (!show) return null;

  return <SiteLoader isDismissing={isDismissing} />;
}
