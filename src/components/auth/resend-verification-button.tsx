"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authError } from "@/lib/auth-validation";
import { notify } from "@/lib/notifications";
import { buttonClass } from "./field";

export function ResendVerificationButton({ email, notificationId }: { email: string; notificationId: string }) {
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    try {
      const result = await authClient.sendVerificationEmail({ email, callbackURL: "/email-megerosites" });
      if (result.error) {
        notify.error(authError(result.error, "verification"), { id: notificationId });
        return;
      }
      notify.success("Kértük a megerősítő levél újraküldését.", { id: notificationId });
    } catch {
      notify.error("A levél küldése nem sikerült. Próbáld újra később.", { id: notificationId });
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={buttonClass} disabled={pending} onClick={resend}>
      {pending ? "Küldés…" : "Megerősítő levél újraküldése"}
    </button>
  );
}
