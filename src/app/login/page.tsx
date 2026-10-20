"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Delete, ShieldAlert, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from") || "/";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Keyboard number listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 6) {
          handleInputDigit(e.key);
        }
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        setPin("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading, selectedUser]);

  const handleInputDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto submit when 6 digits reached
    if (newPin.length === 6) {
      submitLogin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const submitLogin = async (pinToSubmit: string) => {
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
      router.push(fromUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-600/20 mb-2">
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
                onClick={() => {
                  setSelectedUser(u);
                  setPin("");
                  setError(null);
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

      {/* PIN Dots Indicator */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-5">
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? "bg-blue-600 dark:bg-blue-500 scale-110 shadow-sm"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 font-medium animate-in fade-in">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Touch Numpad Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleInputDigit(num)}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono text-xl font-semibold border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 text-xs font-semibold border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            HAPUS
          </button>

          <button
            type="button"
            onClick={() => handleInputDigit("0")}
            disabled={loading}
            className="h-14 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono text-xl font-semibold border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Security Footer Note */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <WifiOff className="w-3 h-3 text-emerald-500" />
        <span>Autentikasi terenkripsi lokal 100% offline</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex flex-col justify-center items-center p-4 select-none transition-colors">
      <Suspense fallback={<div className="text-xs text-slate-400">Memuat layar kunci...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
