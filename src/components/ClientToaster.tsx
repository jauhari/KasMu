"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export default function ClientToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return (
    <Toaster
      position="top-right"
      theme="dark"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-none !border !border-slate-700 !bg-[#121216] !text-slate-200 !font-mono !text-xs !shadow-2xl",
          title: "!text-slate-100 !font-semibold !text-xs",
          description: "!text-slate-400 !text-[11px]",
          success: "!border-emerald-700/60",
          error: "!border-rose-700/60",
          warning: "!border-amber-700/60",
          info: "!border-sky-700/60",
          actionButton: "!rounded-none !bg-amber-600 !text-white !font-bold",
          cancelButton: "!rounded-none !bg-slate-800 !text-slate-300",
          closeButton:
            "!rounded-none !bg-[#121216] !border-slate-700 !text-slate-400 hover:!text-white",
        },
      }}
    />
  );
}
