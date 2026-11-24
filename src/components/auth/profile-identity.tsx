"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlinePencil, HiOutlinePhoto } from "react-icons/hi2";
import { authError, nameSchema } from "@/lib/auth-validation";
import { getMe, meKey, saveProfile, type Me } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { Input } from "@/components/ui/input";
import { buttonClass, secondaryButtonClass } from "./field";
import { UserAvatar } from "./user-avatar";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const notificationId = "profile-edit";

async function prepareAvatar(file: File) {
  const image = await createImageBitmap(file);
  try {
    const side = Math.min(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image canvas unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    image.close();
  }
}

export function ProfileIdentity({ initialMe }: { initialMe: Me }) {
  const { data: { user } } = useQuery({ queryKey: meKey, queryFn: getMe, initialData: initialMe, retry: false });
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const busy = useRef(false);
  const [working, setWorking] = useState<"photo" | "save" | null>(null);
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState<string | null | undefined>();
  const [nameError, setNameError] = useState<string>();
  const preview = image === undefined ? user.image : image ?? undefined;
  const VerificationIcon = user.emailVerified ? HiOutlineCheckCircle : HiOutlineClock;

  function openEditor() {
    setName(user.name);
    setImage(undefined);
    setNameError(undefined);
    dialog.current?.showModal();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      const message = parsed.error.issues[0].message;
      setNameError(message);
      notify.error(message, { id: notificationId });
      return;
    }
    const changes = {
      ...(parsed.data !== user.name && { name: parsed.data }),
      ...(image !== undefined && { image }),
    };
    if (Object.keys(changes).length === 0) {
      dialog.current?.close();
      return;
    }
    busy.current = true;
    setWorking("save");
    try {
      const result = await saveProfile(changes);
      if (result.error) {
        if (result.error.code === "INVALID_NAME") setNameError(authError(result.error));
        notify.error(authError(result.error), { id: notificationId });
        return;
      }
      await client.cancelQueries({ queryKey: meKey, exact: true });
      client.setQueryData(meKey, result.data);
      dialog.current?.close();
      notify.success("Profil módosítva.", { id: notificationId });
    } catch {
      notify.error("A profil mentése nem sikerült. Próbáld újra.", { id: notificationId });
    } finally {
      busy.current = false;
      setWorking(null);
    }
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy.current) return;
    if (!acceptedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      notify.error("Legfeljebb 10 MB-os JPG, PNG vagy WebP képet válassz.", { id: notificationId });
      return;
    }
    busy.current = true;
    setWorking("photo");
    try {
      setImage(await prepareAvatar(file));
    } catch {
      notify.error("A kép nem nyitható meg. Válassz másik képet.", { id: notificationId });
    } finally {
      busy.current = false;
      setWorking(null);
    }
  }

  return <>
    <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-linear-to-br from-brand/15 via-surface to-accent/15 p-4 shadow-sm sm:items-center sm:gap-5 sm:p-8">
      <UserAvatar name={user.name} image={user.image} className="size-12 rounded-2xl text-xl ring-1 ring-brand/20 sm:size-20 sm:text-3xl" />
      <div className="min-w-0 self-center">
        <p className="text-xl font-bold tracking-tight wrap-anywhere sm:text-3xl">{user.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 text-sm text-muted-foreground wrap-anywhere">{user.email}</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.emailVerified
            ? "bg-accent/15 text-emerald-800 dark:text-emerald-300"
            : "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"}`}>
            <VerificationIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">E-mail-cím </span>{user.emailVerified ? "Megerősítve" : "Megerősítésre vár"}
          </span>
        </div>
      </div>
      <button type="button" aria-label="Profil szerkesztése" aria-haspopup="dialog" onClick={openEditor}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-3">
        <HiOutlinePencil aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">Szerkesztés</span>
      </button>
    </header>
    <dialog ref={dialog} aria-labelledby={titleId}
      onCancel={(event) => { if (busy.current) event.preventDefault(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/50 sm:p-6">
      <h2 id={titleId} className="text-xl font-bold">Profil szerkesztése</h2>
      <form method="post" noValidate onSubmit={save} aria-busy={working !== null} className="mt-5 space-y-5">
        <Input type="name" label="Megjelenített név" value={name} onChange={(event) => { setName(event.target.value); setNameError(undefined); }}
          required maxLength={100} disabled={working !== null} error={nameError} />
        <div className="flex items-center gap-4 rounded-xl border border-border p-3">
          <UserAvatar name={name || user.name} image={preview} className="size-14 rounded-xl text-xl" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <label className={`${secondaryButtonClass} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${working ? "opacity-60" : "cursor-pointer"}`}>
              <input type="file" accept={acceptedTypes.join(",")} disabled={working !== null} onChange={selectImage} className="sr-only" />
              <HiOutlinePhoto aria-hidden="true" className="size-4 shrink-0" />
              {working === "photo" ? "Kép betöltése…" : preview ? "Profilkép cseréje" : "Profilkép feltöltése"}
            </label>
            {preview && (
              <button type="button" disabled={working !== null} onClick={() => setImage(user.image ? null : undefined)}
                className="min-h-10 rounded text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
                Kép eltávolítása
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button type="button" className={secondaryButtonClass} disabled={working !== null} onClick={() => dialog.current?.close()}>Mégse</button>
          <button type="submit" className={`${buttonClass} text-sm`} disabled={working !== null}>{working === "save" ? "Mentés…" : "Mentés"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
