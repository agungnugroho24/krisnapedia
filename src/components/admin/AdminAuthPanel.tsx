import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, Shield, Sparkles } from "lucide-react";

type AuthMode = "login" | "forgot" | "reset";


type AuthPanelProps = {
  mode: AuthMode;
  email: string;
  password: string;
  resetPassword: string;
  resetPasswordConfirmation: string;
  loading: boolean;
  error: string;
  notice?: string;
  resetTokenAvailable: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onResetPasswordChange: (value: string) => void;
  onResetPasswordConfirmationChange: (value: string) => void;
  onSubmitLogin: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitForgot: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitReset: (event: React.FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: AuthMode) => void;
}



function passwordStrength(password: string) {
  if (!password.length) {
    return { label: "Belum diisi", width: "0%", tone: "bg-slate-200" };
  }

  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (score <= 1) return { label: "Lemah", width: "20%", tone: "bg-red-500" };
  if (score <= 3) return { label: "Cukup", width: "55%", tone: "bg-amber-500" };
  if (score === 4) return { label: "Kuat", width: "80%", tone: "bg-orange-500" };
  return { label: "Sangat kuat", width: "100%", tone: "bg-green-500" };
}

function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  icon,
  trailing,
  surface = "default",
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  surface?: "default" | "white";
}) {
  const isWhiteSurface = surface === "white";
  const labelClassName = isWhiteSurface ? "text-sm font-medium text-slate-800" : "text-sm font-medium text-foreground";
  const iconClassName = isWhiteSurface ? "text-slate-400" : "text-muted-foreground";
  const inputClassName = isWhiteSurface
    ? "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[var(--primary-deep)] focus:ring-4 focus:ring-[var(--primary-deep)]/10"
    : "w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <div className="space-y-2">
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {icon ? <div className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${iconClassName}`}>{icon}</div> : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputClassName} ${icon ? "pl-11" : ""} ${trailing ? "pr-11" : ""}`}
        />
        {trailing ? <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div> : null}
      </div>
    </div>
  );
}

export function AdminAuthPanel({
  mode,
  email,
  password,
  resetPassword,
  resetPasswordConfirmation,
  loading,
  error,
  notice,
  resetTokenAvailable,
  onEmailChange,
  onPasswordChange,
  onResetPasswordChange,
  onResetPasswordConfirmationChange,
  onSubmitLogin,
  onSubmitForgot,
  onSubmitReset,
  onSwitchMode,
}: AuthPanelProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const strength = useMemo(() => passwordStrength(resetPassword), [resetPassword]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateTheme = () => setIsDarkTheme(document.documentElement.classList.contains("dark"));
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const title = mode === "login" ? "Masuk ke Admin Panel" : mode === "forgot" ? "Lupa Password" : "Reset Password";
  const subtitle =
    mode === "login"
      ? "Gunakan email untuk masuk ke dashboard."
      : mode === "forgot"
        ? "Masukkan email, tautan reset akan dikirimkan ke email."
        : "Masukkan password baru Anda.";
  const leftPanelBackground = isDarkTheme ? "linear-gradient(160deg, #1f2933 0%, #bf5402 55%, #c25b00 100%)" : "linear-gradient(160deg, #1c1410 0%, #2a1a12 55%, #c25b00 100%)";
  const leftPanelAccent = isDarkTheme ? "rgba(255, 81, 0, 0.22)" : "rgba(255, 106, 0, 0.34)";
  const leftPanelGlow = isDarkTheme ? "rgba(246, 78, 0, 0.42)" : "rgba(249,115,22,0.20)";
  const rightPanelClassName = isDarkTheme ? "relative bg-white p-6 text-slate-900 sm:p-8 lg:p-10" : "relative p-6 sm:p-8 lg:p-10";
  const rightHeadingClassName = isDarkTheme ? "text-slate-900" : "text-foreground";
  const rightSubtleClassName = isDarkTheme ? "text-slate-600" : "text-muted-foreground";
  const whiteSurface = isDarkTheme ? "white" : "default";
  const whiteBorderClassName = isDarkTheme ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "border border-border bg-background text-foreground hover:bg-muted";
  const inlineLinkClassName = isDarkTheme ? "font-medium text-[var(--primary-deep)] transition hover:text-primary" : "font-medium text-primary transition hover:text-[var(--primary-deep)]";
  const mutedInlineLinkClassName = isDarkTheme ? "font-medium text-slate-500 transition hover:text-slate-900" : "font-medium text-muted-foreground transition hover:text-foreground";
  const helperTextClassName = isDarkTheme ? "text-slate-500" : "text-muted-foreground";
  const panelCardClassName = isDarkTheme ? "rounded-2xl border border-slate-200 bg-white/50 p-4 backdrop-blur-sm" : "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm";
  const panelCardTitleClassName = isDarkTheme ? "font-medium text-black" : "font-medium text-white";
  const panelCardTextClassName = isDarkTheme ? "mt-1 text-sm leading-6 text-black/72" : "mt-1 text-white/60";
  const panelNoteClassName = isDarkTheme ? "mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-400" : "mt-2 text-[11px] uppercase tracking-[0.24em] text-white/40";
  const passwordStrengthCardClassName = `space-y-2 rounded-2xl border p-3 ${isDarkTheme ? "border-slate-200 bg-slate-50" : "border-border bg-muted/40"} min-h-[112px]`;

  const form =
    mode === "login" ? (
      <form className="space-y-4" onSubmit={onSubmitLogin}>
        <AuthField id="admin-email" label="Email" type="email" value={email} onChange={onEmailChange} placeholder="email@example.com" autoComplete="email" icon={<Mail className="h-4 w-4" />} surface={whiteSurface} />
        <AuthField
          id="admin-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={onPasswordChange}
          placeholder="********"
          autoComplete="current-password"
          icon={<KeyRound className="h-4 w-4" />}
          surface={whiteSurface}
          trailing={
            <button type="button" onClick={() => setShowPassword((current) => !current)} className={isDarkTheme ? "rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" : "rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => onSwitchMode("forgot")} className={inlineLinkClassName}>
            Lupa password?
          </button>
          <span className={helperTextClassName}>Klik lupa password untuk mengubah password</span>
        </div>
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Masuk
        </button>
      </form>
    ) : mode === "forgot" ? (
      <form className="space-y-4" onSubmit={onSubmitForgot}>
        <AuthField id="forgot-email" label="Email" type="email" value={email} onChange={onEmailChange} placeholder="email@example.com" autoComplete="email" icon={<Mail className="h-4 w-4" />} surface={whiteSurface} />
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Kirim tautan reset
        </button>
        <button type="button" onClick={() => onSwitchMode("login")} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${whiteBorderClassName}`}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke login
        </button>
      </form>
    ) : (
      <form className="space-y-4" onSubmit={onSubmitReset}>
        <AuthField id="reset-email" label="Email" type="email" value={email} onChange={onEmailChange} placeholder="email@example.com" autoComplete="email" icon={<Mail className="h-4 w-4" />} surface={whiteSurface} />
        <AuthField
          id="reset-password"
          label="Password baru"
          type={showResetPassword ? "text" : "password"}
          value={resetPassword}
          onChange={onResetPasswordChange}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          icon={<LockKeyhole className="h-4 w-4" />}
          surface={whiteSurface}
          trailing={
            <button type="button" onClick={() => setShowResetPassword((current) => !current)} className={isDarkTheme ? "rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" : "rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"} aria-label={showResetPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}>
              {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <div className={passwordStrengthCardClassName} aria-live="polite">
          <div className={`flex items-center justify-between text-xs font-medium uppercase tracking-wide ${isDarkTheme ? "text-slate-500" : "text-muted-foreground"}`}>
            <span>Kekuatan password</span>
            <span>{strength.label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full ${strength.tone}`} style={{ width: strength.width }} />
          </div>
          <p className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-muted-foreground"}>Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.</p>
        </div>
        <AuthField id="reset-password-confirmation" label="Konfirmasi password" type={showResetPassword ? "text" : "password"} value={resetPasswordConfirmation} onChange={onResetPasswordConfirmationChange} placeholder="Ulangi password baru" autoComplete="new-password" icon={<KeyRound className="h-4 w-4" />} surface={whiteSurface} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => onSwitchMode(resetTokenAvailable ? "reset" : "forgot")} className={inlineLinkClassName}>
            {resetTokenAvailable ? " " : "Kirim ulang tautan"}
          </button>
          <button type="button" onClick={() => onSwitchMode("login")} className={mutedInlineLinkClassName}>
            Kembali ke login
          </button>
        </div>
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          Reset password
        </button>
      </form>
    );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ background: "var(--gradient-hero)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-black/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--primary-soft)]/60 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-black/10 bg-background/95 shadow-[0_30px_120px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden p-8 text-white lg:block" style={{ background: leftPanelBackground }}>
          <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full blur-3xl" style={{ background: leftPanelGlow }} />
          <div className="pointer-events-none absolute left-8 top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: leftPanelAccent }} />
          <div className="relative flex h-full flex-col justify-start gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 backdrop-blur">
                <Shield className="h-4 w-4 text-primary" />
                KRISNApedia Studio
              </div>

              <div className="space-y-4">
                <h1 className="max-w-md font-display text-4xl font-semibold tracking-tight text-white">Seluruh Pengetahuan KRISNA dalam Satu Portal.</h1>
                <p className="max-w-lg text-sm leading-6 text-white/72">Kelola materi, manual, dan berbagai informasi KRISNA secara terstruktur, terpusat, dan mudah diakses untuk mendukung pengelolaan pengetahuan yang lebih efektif.</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-white/80">
              <div className={panelCardClassName}>
                <p className={panelCardTitleClassName}>Pembaruan lebih mudah</p>
                <p className={panelCardTextClassName}>
                  Tambahkan, ubah, dan publikasikan konten pengetahuan KRISNA secara efisien.
                </p>
              </div>

              <div className={panelCardClassName}>
                <p className={panelCardTitleClassName}>Struktur yang rapi</p>
                <p className={panelCardTextClassName}>
                  Organisasikan konten agar selalu tertata, relevan, dan mudah dikelola.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className={rightPanelClassName}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className={`font-display text-3xl font-semibold tracking-tight ${rightHeadingClassName}`}>{title}</h2>
              <p className={`text-sm leading-6 ${rightSubtleClassName}`}>{subtitle}</p>
            </div>

            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            {notice ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary-deep">{notice}</div> : null}
            {form}
          </div>
        </section>
      </div>
    </div>
  );
}













