"use client";

import { useState, useEffect, useRef } from "react";
import { Delete, Lock, Loader2, ArrowRight, Sun, Moon, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface LoginFormProps {
  initialUsers?: UserProfile[];
}

export default function LoginForm({ initialUsers }: LoginFormProps) {
  const { theme, toggleTheme } = useTheme();
  const [fromUrl, setFromUrl] = useState<string>("/");
  const [users] = useState<UserProfile[]>(
    initialUsers && initialUsers.length > 0
      ? initialUsers
      : [
          { id: "cmvhaxa6a0000q14a0gljr5md", username: "owner", name: "Owner Agen Mini-Atm", role: "OWNER" },
          { id: "cmvhaxa6l0001q14a3rsskj0e", username: "kasir1", name: "Kasir Kris Brilink", role: "STAFF" },
        ]
  );
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(
    (initialUsers && initialUsers[0]) || null
  );
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // Initialize client setup
  useEffect(() => {
    // Notify window that React has hydrated
    (window as any).__kmReactReady = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      if (fromParam) setFromUrl(fromParam);
      const errorParam = params.get("error");
      if (errorParam === "invalid_pin") setError("PIN salah atau akun tidak terdaftar");
      if (errorParam === "pin_required") setError("PIN wajib dimasukkan");
    } catch {}

    // Enable CSS :active pseudo-class on iOS Safari
    const enableActiveTouch = () => {};
    window.addEventListener("touchstart", enableActiveTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", enableActiveTouch);
      (window as any).__kmReactReady = false;
    };
  }, []);

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    setPin("");
    setError(null);
    if (pinInputRef.current) pinInputRef.current.value = "";
  };

  const handleDigit = (digit: string) => {
    if (loading) return;
    setError(null);

    setPin((prev) => {
      if (prev.length >= 6) return prev;
      const next = prev + digit;
      if (pinInputRef.current) pinInputRef.current.value = next;
      if (next.length === 6) {
        setTimeout(() => executeLogin(next, selectedUser?.id), 50);
      }
      return next;
    });
  };

  const handleBackspace = () => {
    if (loading) return;
    setError(null);
    setPin((prev) => {
      const next = prev.slice(0, -1);
      if (pinInputRef.current) pinInputRef.current.value = next;
      return next;
    });
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError(null);
    if (pinInputRef.current) pinInputRef.current.value = "";
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      } else if (e.key === "Enter" && pin.length === 6) {
        e.preventDefault();
        executeLogin(pin, selectedUser?.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, pin, selectedUser]);

  const executeLogin = async (pinValue: string, userIdValue?: string) => {
    if (pinValue.length < 6) {
      setError("Masukkan 6 digit PIN lengkap");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinValue,
          userId: userIdValue || undefined,
          from: fromUrl || "/",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "PIN yang dimasukkan salah");
      }

      window.location.href = data.redirectUrl || fromUrl || "/";
    } catch (err: any) {
      setError(err.message || "Gagal masuk kasir");
      setPin("");
      if (pinInputRef.current) pinInputRef.current.value = "";
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#070b14] flex flex-col justify-center items-center p-4 transition-colors relative selection:bg-blue-500 selection:text-white">
      {/* Top Bar: Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Ganti Tema Tampilan"
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
        </button>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-600/20 mb-1">
            KM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            KasMu
            <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
              Layar Kunci
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aplikasi Pembukuan Mini-ATM & Keagenan Bank
          </p>
        </div>

        {/* User Role Selection Tabs */}
        {users.length > 0 && (
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  data-user-id={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`km-user-btn flex-1 py-2 px-2 rounded-lg font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="block truncate">{u.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">
                    {u.role === "OWNER" ? "PEMILIK (OWNER)" : "KASIR (STAFF)"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main PIN Container Form */}
        <form
          id="km-auth-form"
          action="/api/auth/login"
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            executeLogin(pin, selectedUser?.id);
          }}
          className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
        >
          <input
            id="km-user-id-input"
            type="hidden"
            name="userId"
            value={selectedUser?.id || ""}
          />
          <input type="hidden" name="from" value={fromUrl} />

          {/* Hidden input for direct typing */}
          <input
            id="km-pin-input"
            ref={pinInputRef}
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPin(val);
              setError(null);
              if (val.length === 6) {
                setTimeout(() => executeLogin(val, selectedUser?.id), 50);
              }
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* 6-Digit PIN Display Indicator */}
          <div
            onClick={() => pinInputRef.current?.focus()}
            className="flex justify-center items-center gap-2 sm:gap-2.5 py-1 cursor-pointer select-none"
            title="Klik untuk memasukkan PIN"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              const isCurrent = index === pin.length;
              return (
                <div
                  key={index}
                  data-idx={index}
                  className={`km-pin-dot w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none ${
                    isFilled
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 scale-105 shadow-sm"
                      : isCurrent
                      ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-transparent"
                  }`}
                >
                  {isFilled ? "•" : ""}
                </div>
              );
            })}
          </div>

          {/* Status / Error Message */}
          <div className="min-h-[22px] flex items-center justify-center text-center">
            {loading ? (
              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memverifikasi PIN...</span>
              </div>
            ) : error ? (
              <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="km-error-msg">{error}</span>
              </div>
            ) : (
              <span className="km-pin-status text-[11px] text-slate-400">
                {pin.length > 0 ? `${pin.length} / 6 digit dimasukkan` : "Tekan tombol angka atau gunakan keyboard"}
              </span>
            )}
          </div>

          {/* Touch-optimized Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-0.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                data-digit={num}
                onClick={() => handleDigit(num)}
                disabled={loading}
                className="h-13 sm:h-15 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-bold border border-slate-200 dark:border-slate-700 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
              >
                {num}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              data-action="clear"
              onClick={handleClear}
              disabled={loading}
              className="h-13 sm:h-15 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 active:scale-90 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              HAPUS
            </button>

            {/* Zero Digit */}
            <button
              type="button"
              data-digit="0"
              onClick={() => handleDigit("0")}
              disabled={loading}
              className="h-13 sm:h-15 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-bold border border-slate-200 dark:border-slate-700 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              data-action="backspace"
              onClick={handleBackspace}
              disabled={loading}
              className="h-13 sm:h-15 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-90 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={pin.length < 6 || loading}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              pin.length === 6 && !loading
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30 cursor-pointer active:scale-95"
                : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi PIN...</span>
              </>
            ) : (
              <>
                <span>Buka Kasir Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autentikasi offline terenkripsi HMAC-SHA256</span>
        </div>
      </div>

      {/* Zero-Hydration Standalone DOM Controller (Enables instant response before React hydrates) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  // Enable active pseudo-class on iOS Safari
  document.addEventListener('touchstart', function() {}, { passive: true });

  function initKeypad() {
    var form = document.getElementById('km-auth-form');
    if (!form || form.dataset.initDone) return;
    form.dataset.initDone = '1';

    var pinInput = document.getElementById('km-pin-input');
    var userIdInput = document.getElementById('km-user-id-input');
    var dots = form.querySelectorAll('.km-pin-dot');
    var statusText = form.querySelector('.km-pin-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    function syncDots(val) {
      if (pinInput) pinInput.value = val;
      dots.forEach(function(dot, idx) {
        if (idx < val.length) {
          dot.textContent = '•';
          dot.className = 'km-pin-dot w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 scale-105 shadow-sm';
        } else if (idx === val.length) {
          dot.textContent = '';
          dot.className = 'km-pin-dot w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900';
        } else {
          dot.textContent = '';
          dot.className = 'km-pin-dot w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-transparent';
        }
      });
      if (statusText) {
        statusText.textContent = val.length > 0 ? (val.length + ' / 6 digit dimasukkan') : 'Tekan tombol angka atau gunakan keyboard';
      }
      if (submitBtn) {
        if (val.length === 6) {
          submitBtn.removeAttribute('disabled');
          submitBtn.className = 'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30 cursor-pointer active:scale-95';
        } else {
          submitBtn.setAttribute('disabled', 'true');
          submitBtn.className = 'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800';
        }
      }
    }

    form.querySelectorAll('button[data-digit]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        var digit = btn.getAttribute('data-digit');
        var curr = (pinInput ? pinInput.value : '') || '';
        if (curr.length < 6) {
          var next = curr + digit;
          syncDots(next);
          if (next.length === 6) {
            setTimeout(function() { form.requestSubmit ? form.requestSubmit() : form.submit(); }, 60);
          }
        }
      });
    });

    var clearBtn = form.querySelector('button[data-action="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        syncDots('');
      });
    }

    var backBtn = form.querySelector('button[data-action="backspace"]');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        var curr = (pinInput ? pinInput.value : '') || '';
        syncDots(curr.slice(0, -1));
      });
    }

    document.querySelectorAll('.km-user-btn').forEach(function(uBtn) {
      uBtn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        var uId = uBtn.getAttribute('data-user-id');
        if (userIdInput && uId) userIdInput.value = uId;
        syncDots('');
        document.querySelectorAll('.km-user-btn').forEach(function(b) {
          if (b === uBtn) {
            b.className = 'km-user-btn flex-1 py-2 px-2 rounded-lg font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold';
          } else {
            b.className = 'km-user-btn flex-1 py-2 px-2 rounded-lg font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200';
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeypad);
  } else {
    initKeypad();
  }
})();
`,
        }}
      />
    </div>
  );
}
