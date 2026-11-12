"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { notify } from "@/lib/notifications";
import { consumeAuthNotice } from "@/lib/auth-notices";

export function AppToaster() {
  useEffect(() => {
    const message = consumeAuthNotice();
    if (message) notify.success(message, { id: "auth-navigation" });
  }, []);
  return <Toaster position="top-right" toastOptions={{
    duration: 5000,
    className: "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lg",
    error: { duration: 6000 },
  }} />;
}
