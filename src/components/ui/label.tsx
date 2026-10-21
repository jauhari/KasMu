"use client";

import React from "react";
import { LabelProps } from "./types";

export function Label({ children, className = "", ...rest }: LabelProps) {
  return (
    <label className={`km-label ${className}`} {...rest}>
      {children}
    </label>
  );
}
