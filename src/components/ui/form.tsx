"use client";

import React from "react";
import { FormProps } from "./types";

export function Form({ children, className = "", ...rest }: FormProps) {
  return (
    <div className={`km-form ${className}`} {...rest}>
      {children}
    </div>
  );
}
