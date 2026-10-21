"use client";

import { useState, useEffect, useRef } from "react";
import { Delete, Lock, Loader2, ArrowRight, Sun, Moon, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button, Badge } from "@/components/ui";

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

  // Zero-hydration DOM refs for instant pre-hydration response
  const pinInputRef = useRef<HTMLInputElement>(null);
  const userIdInputRef = useRef<HTMLInputElement>(null);

  // Initialize client setup
  useEffect(() => {
    (window as any).__kmReactReady = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      if (fromParam) setFromUrl(fromParam);
      const errorParam = params.get("error");
      if (errorParam === "invalid_pin") setError("PIN salah atau akun tidak terdaftar");
      if (errorParam === "pin_required") setError("PIN wajib dimasukkan");
    } catch {}

    window.addEventListener("touchstart", () => {}, { passive: true });
    return () => {
      (window as any).__kmReactReady = false;
    };
  }, []);

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    setPin("");
    setError(null);
    if (userIdInputRef.current) userIdInputRef.current.value = u.id;
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
    <div className="min-h-screen w-full bg-[#050507] flex flex-col justify-center items-center p-4 transition-colors relative selection:bg-amber-600 selection:text-white">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Ganti Tema Tampilan"
          className="p-2 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors bg-[#0d0d11] active:scale-95"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 border border-slate-700 text-white font-bold text-xl bg-[#0d0d11] shadow-lg shadow-amber-500/10">
            KM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            KasMu
            <Badge variant="default" className="text-[10px] bg-slate-800 border-slate-700 text-slate-400 px-2 py-0.5">
              Layar Kunci
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">
            Aplikasi Pembukuan Mini-ATM & Keagenan Bank
          </p>
        </div>

        {users.length > 0 && (
          <div className="flex bg-[#0d0d11] p-0.5 rounded-none border border-slate-700 text-xs">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  data-user-id={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`km-user-btn flex-1 py-2 px-2 rounded-none font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 border-t border-b border-l ${
                    isSelected
                      ? "border-amber-600 bg-[#15151a] text-white shadow-sm font-bold border-r-0"
                      : "text-slate-500 hover:text-white hover:border-slate-600"
                  } ${u.id === users[users.length - 1].id ? "border-r" : "border-r-0"}`}
                >
                  <span className="block truncate">{u.name}</span>
                  <span className="text-[9px] text-slate-600 uppercase font-mono block">
                    {u.role === "OWNER" ? "PEMILIK" : "KASIR"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-xl space-y-5">
          {/* Hidden inputs for form submission */}
          <input
            id="km-user-id-input"
            type="hidden"
            ref={userIdInputRef}
            value={selectedUser?.id || ""}
            name="userId"
          />
          <input type="hidden" name="from" value={fromUrl} />
          <input
            id="km-pin-input"
            ref={pinInputRef}
            type="hidden"
            name="pin"
            value={pin}
          />

          {/* 6-Digit PIN Display */}
          <div
            className="flex justify-center items-center gap-3 py-2 cursor-pointer select-none"
            title="Klik untuk memasukkan PIN"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              const isCurrent = index === pin.length;
              return (
                <div
                  key={index}
                  data-idx={index}
                  className={`km-pin-dot w-10 h-12 rounded-none border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none ${
                    isFilled
                      ? "border-amber-600 bg-[#15151a] text-amber-400 scale-105 shadow-sm"
                      : isCurrent
                      ? "border-amber-500 ring-1 ring-amber-500/30 bg-[#050507]"
                      : "border-slate-700 bg-[#0d0d11] text-transparent"
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
              <div className="text-xs text-amber-500 flex items-center gap-2 font-medium animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memverifikasi PIN...</span>
              </div>
            ) : error ? (
              <div className="text-xs text-rose-400 flex items-center gap-2 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="km-error-msg">{error}</span>
              </div>
            ) : (
              <span className="km-pin-status text-[11px] text-slate-500">
                {pin.length > 0 ? `${pin.length} / 6 digit` : "Tekan tombol angka atau keyboard"}
              </span>
            )}
          </div>

          {/* Touch-optimized Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 pt-1">
{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                data-digit={num}
                onClick={() => handleDigit(num)}
                disabled={loading}
                className="h-14 rounded-none bg-[#0d0d11] hover:bg-[#15151a] active:bg-amber-600 active:text-white text-white font-mono text-2xl font-bold border border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none shadow-sm"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              data-action="clear"
              onClick={handleClear}
              disabled={loading}
              className="h-14 rounded-none bg-[#0d0d11] hover:bg-[#15151a] active:bg-slate-700 text-slate-500 font-bold border border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              HAPUS
            </button>

            <button
              type="button"
              data-digit="0"
              onClick={() => handleDigit("0")}
              disabled={loading}
              className="h-14 rounded-none bg-[#0d0d11] hover:bg-[#15151a] active:bg-amber-600 active:text-white text-white font-mono text-2xl font-bold border border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              data-action="backspace"
              onClick={handleBackspace}
              disabled={loading}
              className="h-14 rounded-none bg-[#0d0d11] hover:bg-[#15151a] active:bg-slate-700 text-slate-400 border border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Action Button */}
          <button
            type="button"
            disabled={pin.length < 6 || loading}
            onClick={() => executeLogin(pin, selectedUser?.id)}
            className={`w-full py-3.5 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all border border-transparent ${
              pin.length === 6 && !loading
                ? "bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/20 cursor-pointer active:scale-95"
                : "bg-[#0d0d11] text-slate-600 border-slate-700 cursor-not-allowed"
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
        </div>

        <div className="text-center text-[11px] text-slate-600 flex items-center justify-center gap-2 pt-1 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autentikasi offline HMAC-SHA256</span>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  document.addEventListener('touchstart', function() {}, { passive: true });

  function initKeypad() {
    var form = document.getElementById('km-auth-form');
    var pinInput = document.getElementById('km-pin-input');
    var userIdInput = document.getElementById('km-user-id-input');
    if (!pinInput || !userIdInput) return;

    var dots = document.querySelectorAll('.km-pin-dot');
    var statusText = document.querySelector('.km-pin-status');
    var submitBtn = document.querySelector('button[type="button"]:last-of-type');

    function syncDots(val) {
      pinInput.value = val;
      dots.forEach(function(dot, idx) {
        if (idx < val.length) {
          dot.textContent = '•';
          dot.className = 'km-pin-dot w-10 h-12 rounded-none border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-amber-600 bg-[#15151a] text-amber-400 scale-105 shadow-sm';
        } else if (idx === val.length) {
          dot.textContent = '';
          dot.className = 'km-pin-dot w-10 h-12 rounded-none border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-amber-500 ring-1 ring-amber-500/30 bg-[#050507]';
        } else {
          dot.textContent = '';
          dot.className = 'km-pin-dot w-10 h-12 rounded-none border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 select-none border-slate-700 bg-[#0d0d11] text-transparent';
        }
      });
      if (statusText) {
        statusText.textContent = val.length > 0 ? (val.length + ' / 6 digit') : 'Tekan tombol angka atau keyboard';
      }
      if (submitBtn) {
        if (val.length === 6) {
          submitBtn.className = 'w-full py-3.5 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all border border-transparent bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/20 cursor-pointer active:scale-95';
          submitBtn.disabled = false;
        } else {
          submitBtn.className = 'w-full py-3.5 rounded-none font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all border border-transparent bg-[#0d0d11] text-slate-600 border-slate-700 cursor-not-allowed';
          submitBtn.disabled = true;
        }
      }
    }

    document.querySelectorAll('button[data-digit]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        var digit = btn.getAttribute('data-digit');
        var curr = pinInput.value || '';
        if (curr.length < 6) {
          var next = curr + digit;
          syncDots(next);
          if (next.length === 6) {
            setTimeout(function() {
              var evt = new Event('submit', { bubbles: true, cancelable: true });
              document.dispatchEvent(evt);
            }, 60);
          }
        }
      });
    });

    var clearBtn = document.querySelector('button[data-action="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        syncDots('');
      });
    }

    var backBtn = document.querySelector('button[data-action="backspace"]');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        if (window.__kmReactReady) return;
        var curr = pinInput.value || '';
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
            b.className = 'km-user-btn flex-1 py-2 px-2 rounded-none font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 border-t border-b border-l border-amber-600 bg-[#15151a] text-white shadow-sm font-bold border-r-0';
          } else {
            b.className = 'km-user-btn flex-1 py-2 px-2 rounded-none font-medium transition-all text-center truncate cursor-pointer select-none active:scale-95 border-t border-b border-l text-slate-500 hover:text-white hover:border-slate-600 border-r-0';
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
