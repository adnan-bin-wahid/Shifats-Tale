"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface DebouncedSearchInputProps {
  placeholder?: string;
  defaultValue?: string;
  paramName?: string;
  className?: string;
}

export function DebouncedSearchInput({ 
  placeholder = "Search...", 
  defaultValue = "",
  paramName = "search",
  className = "w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold focus:border-primary focus:outline-none placeholder:text-muted/70 text-primary"
}: DebouncedSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Use state to make it a controlled input for immediate feedback
  const [value, setValue] = useState(defaultValue || searchParams.get(paramName) || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Sync with URL if it changes externally (e.g., via browser back button)
    const currentParam = searchParams.get(paramName) || "";
    if (currentParam !== value && !debounceRef.current) {
      setValue(currentParam);
    }
  }, [searchParams, paramName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      // If inside a form, preserve any unsubmitted select/input filter values from that form
      if (inputRef.current?.form) {
        const formData = new FormData(inputRef.current.form);
        formData.forEach((val, key) => {
          if (typeof val === "string" && val.trim() !== "") {
            params.set(key, val.trim());
          } else {
            params.delete(key);
          }
        });
      }

      if (newValue.trim() !== "") {
        params.set(paramName, newValue.trim());
      } else {
        params.delete(paramName);
      }
      
      // When a new search occurs, we should generally reset pagination to page 1
      if (params.has("page")) {
        params.set("page", "1");
      }

      router.push(`${pathname}?${params.toString()}`);
      debounceRef.current = null;
    }, 400); // 400ms debounce
  };

  return (
    <div className="relative w-full h-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      <input
        ref={inputRef}
        type="text"
        name={paramName}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
