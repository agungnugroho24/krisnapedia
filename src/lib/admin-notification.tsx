import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type AdminNotificationKind = "success" | "error";

type AdminNotificationInput = {
  kind: AdminNotificationKind;
  title: string;
  message?: string;
  durationMs?: number;
};

type AdminNotification = AdminNotificationInput & {
  id: number;
};

type Listener = (notification: AdminNotification | null) => void;

type AdminConfirmInput = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type AdminConfirm = AdminConfirmInput & {
  id: number;
  resolve: (result: boolean) => void;
};

type ConfirmListener = (confirm: AdminConfirm | null) => void;

const defaultDurationMs = 2400;
const listeners = new Set<Listener>();
const confirmListeners = new Set<ConfirmListener>();

let activeNotification: AdminNotification | null = null;
let activeConfirm: AdminConfirm | null = null;
let notificationId = 0;
let confirmId = 0;

function emit(notification: AdminNotification | null) {
  activeNotification = notification;
  listeners.forEach((listener) => listener(notification));
}

function dismissAdminNotification(id?: number) {
  if (!activeNotification) return;
  if (typeof id === "number" && activeNotification.id !== id) return;
  emit(null);
}

function emitConfirm(confirm: AdminConfirm | null) {
  activeConfirm = confirm;
  confirmListeners.forEach((listener) => listener(confirm));
}

function settleAdminConfirm(result: boolean, id?: number) {
  if (!activeConfirm) return;
  if (typeof id === "number" && activeConfirm.id !== id) return;

  const confirm = activeConfirm;
  emitConfirm(null);
  confirm.resolve(result);
}

export function showAdminNotification(input: AdminNotificationInput) {
  const notification: AdminNotification = {
    ...input,
    id: ++notificationId,
  };

  emit(notification);

  return notification.id;
}

export function showAdminSuccess(title: string, message?: string) {
  return showAdminNotification({ kind: "success", title, message });
}

export function showAdminError(title: string, message?: string) {
  return showAdminNotification({ kind: "error", title, message });
}

export function confirmAdminDelete(title: string, message?: string) {
  return new Promise<boolean>((resolve) => {
    const confirm: AdminConfirm = {
      id: ++confirmId,
      title,
      message,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      resolve,
    };

    emitConfirm(confirm);
  });
}

export function AdminNotificationHost() {
  const [notification, setNotification] = useState<AdminNotification | null>(activeNotification);

  useEffect(() => {
    const listener: Listener = (next) => setNotification(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!notification) return;

    const duration = notification.durationMs ?? defaultDurationMs;
    const timer = window.setTimeout(() => {
      dismissAdminNotification(notification.id);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notification]);

  if (!notification || typeof document === "undefined") return null;

  const isSuccess = notification.kind === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismissAdminNotification(notification.id);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`admin-notification-title-${notification.id}`}
        aria-describedby={notification.message ? `admin-notification-message-${notification.id}` : undefined}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-border/70 bg-background shadow-2xl shadow-slate-950/30"
      >
        <button
          type="button"
          aria-label="Tutup notifikasi"
          onClick={() => dismissAdminNotification(notification.id)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={[
            "px-6 pb-6 pt-8 text-center",
            isSuccess
              ? "bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_58%)]"
              : "bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_58%)]",
          ].join(" ")}
        >
          <div
            className={[
              "mx-auto flex h-20 w-20 items-center justify-center rounded-full border shadow-lg",
              isSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-600 shadow-emerald-500/10"
                : "border-rose-200 bg-rose-50 text-rose-600 shadow-rose-500/10",
            ].join(" ")}
          >
            <Icon className="h-10 w-10" />
          </div>

          <div className="mt-5 space-y-2">
            <h3
              id={`admin-notification-title-${notification.id}`}
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              {notification.title}
            </h3>
            {notification.message ? (
              <p
                id={`admin-notification-message-${notification.id}`}
                className="text-sm leading-6 text-muted-foreground"
              >
                {notification.message}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => dismissAdminNotification(notification.id)}
              className={[
                "inline-flex min-w-32 items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg transition",
                isSuccess
                  ? "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600"
                  : "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600",
              ].join(" ")}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AdminConfirmHost() {
  const [confirm, setConfirm] = useState<AdminConfirm | null>(activeConfirm);

  useEffect(() => {
    const listener: ConfirmListener = (next) => setConfirm(next);
    confirmListeners.add(listener);
    return () => {
      confirmListeners.delete(listener);
    };
  }, []);

  if (!confirm || typeof document === "undefined") return null;

  return (
    <AlertDialog
      open={Boolean(confirm)}
      onOpenChange={(open) => {
        if (!open) settleAdminConfirm(false, confirm.id);
      }}
    >
      <AlertDialogContent className="rounded-[2rem] border-border/70 bg-background shadow-2xl shadow-slate-950/20 sm:max-w-md">
        <AlertDialogHeader className="space-y-3 text-left sm:text-left">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-2xl">{confirm.title}</AlertDialogTitle>
          {confirm.message ? (
            <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
              {confirm.message}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-2">
          <AlertDialogCancel
            onClick={() => settleAdminConfirm(false, confirm.id)}
            className="mt-0 rounded-full px-5"
          >
            {confirm.cancelLabel ?? "Batal"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settleAdminConfirm(true, confirm.id)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-transparent bg-destructive px-5 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
          >
            {confirm.confirmLabel ?? "Lanjutkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
