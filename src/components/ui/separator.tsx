"use client";

import React from "react";

export function Separator({ className = "", ...rest }: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr className={`km-separator h-px bg-slate-700/40 w-full ${className}`} {...rest} />
  );
}
