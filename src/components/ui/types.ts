import React from "react";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: "solid" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "label"
  > {
  label?: string;
  value?: string | number;
  onValueChange?: (value: string) => void;
  type?: "text" | "number" | "password";
  placeholder?: string;
  error?: string;
  required?: boolean;
  fontMono?: boolean;
  accounting?: boolean;
}

export interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "onChange" | "label"
  > {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export interface FormProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  children: React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export interface LabelProps
  extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "children"> {
  children: React.ReactNode;
  required?: boolean;
}

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: "default" | "success" | "danger" | "warning" | "info";
  children: React.ReactNode;
}
