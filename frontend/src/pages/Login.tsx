import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, User, Mail, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";

export const Login: React.FC = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Authentication failed.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await register(username.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage("Account created successfully as Public User. Please sign in.");
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    } else {
      setError(result.error || "Registration failed.");
    }
  };

  const handleDemoLogin = async (demoUsername: string) => {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await login(demoUsername, undefined, true);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Demo authentication failed.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-white relative">
      {/* Language Switcher in top right corner */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector variant="compact" />
      </div>

      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[650px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-2 shadow-lg shadow-cyan-500/10">
            <img
              src="/nexus-ner-logo.png"
              alt="NEXUS-NER Logo"
              className="h-full w-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">NEXUS-NER</h1>
          <p className="mt-1 text-xs text-slate-400">
            {t.auth.platformSubtitle}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-950/70 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === "login"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.auth.tabLogin}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === "register"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.auth.tabRegister}
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.usernameLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{t.auth.authenticating}</span>
                ) : (
                  <>
                    <span>{t.auth.loginSubmitBtn}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.usernameLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.emailLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                    aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    title={showRegisterPassword ? "Hide password" : "Show password"}
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.auth.confirmPasswordLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showRegisterConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                    aria-label={showRegisterConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    title={showRegisterConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-emerald-400 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{t.auth.registering}</span>
                ) : (
                  <>
                    <span>{t.auth.registerSubmitBtn}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick-select Demo Credentials & SIH Evaluator Access */}
          <div className="mt-8 border-t border-slate-800/80 pt-5">
            {/* Dedicated SIH Demo Access Button */}
            <div className="mb-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("sih_evaluator")}
                className="w-full group relative flex items-center justify-between rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 px-3.5 py-3 text-left transition hover:border-emerald-400 hover:from-emerald-500/30 hover:to-cyan-500/30 shadow-lg shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-200 flex items-center gap-1.5">
                      🚀 Enter SIH Demo
                    </span>
                    <p className="text-[10px] text-emerald-300 font-medium">
                      SIH_EVALUATOR (Read-Only Operational Access)
                    </p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2.5">
              {t.auth.demoRolesLabel}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("operator")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-left text-xs transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-slate-200">{t.auth.roleOperator}</span>
                  <p className="text-[10px] text-slate-500 truncate">CONTROL_OPERATOR</p>
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("admin")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-left text-xs transition hover:border-purple-500/50 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-purple-400 shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-slate-200">{t.auth.roleAdmin}</span>
                  <p className="text-[10px] text-slate-500 truncate">ADMIN</p>
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("field_officer")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-left text-xs transition hover:border-amber-500/50 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-slate-200">{t.auth.roleFieldOfficer}</span>
                  <p className="text-[10px] text-slate-500 truncate">FIELD_OFFICER</p>
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("driver")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-slate-200">{t.auth.roleDriver}</span>
                  <p className="text-[10px] text-slate-500 truncate">DRIVER</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-slate-600">
          {t.auth.footerInfo}
        </p>
      </div>
    </div>
  );
};

export default Login;
