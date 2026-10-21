"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Delete, ShieldAlert, WifiOff, Loader2, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [fromUrl, setFromUrl] = useState<string>("/");
  const lastActionTime = useRef<number>(0);

  const [users, setUsers] = useState<UserProfile[]>([
    { id: "cmvhaxa6a0000q14a0gljr5md", username: "owner", name: "Owner Agen Mini-Atm", role: "OWNER" },
    { id: "cmvhaxa6l0001q14a3rsskj0e", username: "kasir1", name: "Kasir Kris Brilink", role: "STAFF" },
  ]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>({
    id: "cmvhaxa6a0000q14a0gljr5md",
    username: "owner",
    name: "Owner Agen Mini-Atm",
    role: "OWNER",
  });
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Read query params safely on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setFromUrl(params.get("from") || "/");
    }
  }, []);

  // Fetch available active users
  useEffect(() => {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setUsers(json.data);
          const defaultUser = json.data.find((u: UserProfile) => u.role === "OWNER") || json.data[0];
          setSelectedUser(defaultUser);
        }
      })
      .catch(console.error);
  }, []);

  // Robust digit handler (supports touch, mouse, and hardware keyboard)
  const handleDigit = (digit: string) => {
    const now = Date.now();
    if (now - lastActionTime.current < 50) return; // Debounce rapid pointerdown + click
    lastActionTime.current = now;

    if (loading) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }

    setPin((prev) => {
      if (prev.length >= 6) return prev;
      const next = prev + digit;
      if (next.length === 6) {
        setTimeout(() => submitLogin(next), 60);
      }
      return next;
    });
    setError(null);
  };

  const handleBackspace = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 50) return;
    lastActionTime.current = now;

    if (loading) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 50) return;
    lastActionTime.current = now;

    if (loading) return;
    setPin("");
    setError(null);
  };

  // Physical keyboard listener
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
        handleClear();
      } else if (e.key === "Enter" && pin.length === 6) {
        submitLogin(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, pin, selectedUser]);

  const submitLogin = async (pinToSubmit: string) => {
    if (pinToSubmit.length < 6) {
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
          pin: pinToSubmit,
          userId: selectedUser ? selectedUser.id : undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "PIN yang dimasukkan salah");
      }

      toast.success(json.message || "Login berhasil!");
      // Redirect to target or dashboard
      window.location.href = fromUrl || "/";
    } catch (err: any) {
      setError(err.message || "Gagal masuk kasir");
      setPin("");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#070b14] flex flex-col justify-center items-center p-4 transition-colors">
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

        {/* User Role Selector Tabs */}
        {users.length > 0 && (
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onPointerDown={() => {
                    setSelectedUser(u);
                    setPin("");
                    setError(null);
                  }}
                  onClick={() => {
                    setSelectedUser(u);
                    setPin("");
                    setError(null);
                  }}
                  style={{ touchAction: "manipulation" }}
                  className={`flex-1 py-2 px-2 rounded-lg font-medium transition-all text-center truncate cursor-pointer ${
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

        {/* PIN Container */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Segmented 6-digit PIN Boxes */}
          <div className="flex justify-center items-center gap-2 sm:gap-2.5 py-1">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              const isCurrent = index === pin.length;
              return (
                <div
                  key={index}
                  className={`w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all duration-150 ${
                    isFilled
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 scale-105 shadow-sm"
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
              <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                {pin.length > 0 ? `${pin.length} / 6 digit dimasukkan` : "Tekan tombol angka atau ketik di keyboard"}
              </span>
            )}
          </div>

          {/* Touch Numpad Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-0.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                data-digit={num}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDigit(num);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleDigit(num);
                }}
                disabled={loading}
                style={{ touchAction: "manipulation" }}
                className="h-13 sm:h-15 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/90 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-bold border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              onClick={(e) => {
                e.preventDefault();
                handleClear();
              }}
              disabled={loading}
              style={{ touchAction: "manipulation" }}
              className="h-13 sm:h-15 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              RESET
            </button>

            <button
              type="button"
              data-digit="0"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDigit("0");
              }}
              onClick={(e) => {
                e.preventDefault();
                handleDigit("0");
              }}
              disabled={loading}
              style={{ touchAction: "manipulation" }}
              className="h-13 sm:h-15 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/90 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-bold border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
            >
              0
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleBackspace();
              }}
              onClick={(e) => {
                e.preventDefault();
                handleBackspace();
              }}
              disabled={loading}
              style={{ touchAction: "manipulation" }}
              className="h-13 sm:h-15 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Submit Action Button */}
          <button
            type="button"
            disabled={pin.length < 6 || loading}
            onClick={() => submitLogin(pin)}
            style={{ touchAction: "manipulation" }}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              pin.length === 6 && !loading
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 cursor-pointer active:scale-[0.98]"
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
        </div>

        {/* 1-Tap Quick Login Helpers */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs space-y-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold pb-1 border-b border-slate-100 dark:border-slate-800">
            <KeyRound className="w-3.5 h-3.5 text-blue-500" />
            <span>Pintasan Masuk Cepat (1-Klik):</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-400">Pemilik / Owner:</span>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                const owner = users.find((u) => u.role === "OWNER") || users[0];
                setSelectedUser(owner);
                setPin("123456");
                submitLogin("123456");
              }}
              style={{ touchAction: "manipulation" }}
              className="py-1 px-2.5 rounded-lg font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer text-xs active:scale-95"
            >
              123456 (Masuk Owner)
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-600 dark:text-slate-400">Kasir / Staff:</span>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                const staff = users.find((u) => u.role === "STAFF") || users[1];
                if (staff) setSelectedUser(staff);
                setPin("112233");
                submitLogin("112233");
              }}
              style={{ touchAction: "manipulation" }}
              className="py-1 px-2.5 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer text-xs active:scale-95"
            >
              112233 (Masuk Kasir)
            </button>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
          <WifiOff className="w-3 h-3 text-emerald-500" />
          <span>Autentikasi offline terenkripsi HMAC-SHA256</span>
        </div>
      </div>
    </div>
  );
}
