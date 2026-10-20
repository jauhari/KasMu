"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Delete, ShieldAlert, WifiOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fromUrl, setFromUrl] = useState<string>("/");

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

  // Read query params safely on client without de-opting SSR
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setFromUrl(params.get("from") || "/");
      // Auto-focus input for physical keyboard
      inputRef.current?.focus();
    }
  }, []);

  // Fetch available active users for profile selection
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

  // Keyboard number listener on window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleInputDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        setPin("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading, selectedUser]);

  const handleInputDigit = (digit: string) => {
    if (loading || pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto submit when 6 digits reached
    if (newPin.length === 6) {
      submitLogin(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError(null);
  };

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
      window.location.href = fromUrl || "/";
    } catch (err: any) {
      setError(err.message);
      setPin("");
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-screen w-full bg-slate-50 dark:bg-[#070b14] flex flex-col justify-center items-center p-4 select-none transition-colors"
    >
      {/* Hidden input for hardware keyboard & barcode scanner support */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
          setPin(val);
          setError(null);
          if (val.length === 6) submitLogin(val);
        }}
        className="sr-only"
        autoFocus
      />

      <div className="w-full max-w-sm space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-600/20 mb-1">
            KM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            KasMu
            <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
              Layar Kunci
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Masukkan PIN 6-digit untuk membuka kasir
          </p>
        </div>

        {/* User Profile Selector Tabs */}
        {users.length > 0 && (
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(u);
                    setPin("");
                    setError(null);
                    inputRef.current?.focus();
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg font-medium transition-all text-center truncate ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="block truncate">{u.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">
                    {u.role}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* PIN Box & Dots */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <div className="flex justify-center items-center gap-3 py-1">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? "bg-blue-600 dark:bg-blue-500 scale-125 shadow-md shadow-blue-500/40 ring-2 ring-blue-400/30"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              );
            })}
          </div>

          {/* Status / Error Message */}
          <div className="min-h-[20px] flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memverifikasi PIN...</span>
              </div>
            ) : error ? (
              <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                {pin.length > 0 ? `${pin.length} / 6 digit` : "Klik tombol angka atau ketik di keyboard"}
              </span>
            )}
          </div>

          {/* Touch Numpad Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                data-digit={num}
                onClick={(e) => {
                  e.stopPropagation();
                  handleInputDigit(num);
                }}
                disabled={loading}
                className="h-14 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-semibold border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              HAPUS
            </button>

            <button
              type="button"
              data-digit="0"
              onClick={(e) => {
                e.stopPropagation();
                handleInputDigit("0");
              }}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:bg-blue-600 active:text-white dark:active:bg-blue-600 text-slate-900 dark:text-white font-mono text-2xl font-semibold border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBackspace();
              }}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Submit Button if 6 digits entered */}
          {pin.length === 6 && !loading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                submitLogin(pin);
              }}
              className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all animate-in fade-in"
            >
              <span>Buka Kasir Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3 h-3 text-emerald-500" />
          <span>Autentikasi offline terenkripsi HMAC-SHA256</span>
        </div>
      </div>
    </div>
  );
}
