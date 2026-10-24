"use client";

import { useEffect, useState } from "react";
import { History, CheckCircle2, RefreshCw, Server } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

interface VersionInfo {
  latest: ChangelogEntry | null;
  entries: ChangelogEntry[];
  changelogMtime: string | null;
  buildTime: string | null;
}

export default function PerubahanPage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    fetch("/api/version")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInfo(json.data);
        else setError(json.error || "Gagal memuat versi");
      })
      .catch(() => setError("Gagal memuat versi"))
      .finally(() => setRefreshing(false));
  };

  useEffect(load, []);

  const latest = info?.latest;

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-amber-700/50 bg-amber-900/20 flex items-center justify-center">
            <History className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">
              Log Perubahan
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              Versi &amp; riwayat update KasMu
            </p>
          </div>
          <button
            onClick={load}
            className="ml-auto p-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Status Server */}
        <div className="border border-slate-700 bg-[#0d0d11] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-white">
              Status Server (kasmu.jauhari.net)
            </h2>
          </div>
          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}
          {!error && !info && (
            <p className="text-xs text-slate-500 font-mono">Memuat…</p>
          )}
          {info && (
            <div className="space-y-2 text-xs">
              {latest ? (
                <div className="flex items-center gap-2 p-3 border border-emerald-700/40 bg-emerald-900/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Server menjalankan <strong className="font-mono text-emerald-400">v{latest.version}</strong>
                    {" "}— <em>{latest.title || "Perbarui changelog"}</em> ({latest.date})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-500">
                  CHANGELOG.md belum tersedia di server — tidak ada info versi.
                </p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div className="p-2 border border-slate-800 bg-[#0a0a0a]/40">
                  <dt className="text-[9px] uppercase text-slate-500 tracking-wider">Waktu Build</dt>
                  <dd>{info.buildTime || "tidak terbaca"}</dd>
                </div>
                <div className="p-2 border border-slate-800 bg-[#0a0a0a]/40">
                  <dt className="text-[9px] uppercase text-slate-500 tracking-wider">CHANGELOG Disimpan</dt>
                  <dd>{info.changelogMtime || "tidak terbaca"}</dd>
                </div>
              </dl>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Bandingkan versi di atas dengan entri terbaru berikut: kalau
                versi masih di bawah entri di bawah, berarti deployment terakhir
                belum membawa perubahan itu.
              </p>
            </div>
          )}
        </div>

        {/* Riwayat versi */}
        <div className="space-y-4">
          {(info?.entries || []).map((e, i) => (
            <article
              key={e.version}
              className={`border p-4 ${i === 0 ? "border-amber-700/50 bg-amber-900/5" : "border-slate-800 bg-[#0d0d11]"}`}
            >
              <header className="flex items-baseline gap-3 mb-2">
                <h3 className="font-mono font-bold text-white text-sm">v{e.version}</h3>
                <span className="text-[10px] text-slate-500 font-mono">{e.date}</span>
                {i === 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase border border-amber-700/50 bg-amber-900/20 text-amber-500">
                    Terbaru
                  </span>
                )}
              </header>
              {e.title && (
                <p className="text-[11px] font-semibold text-amber-500/90 uppercase tracking-wide mb-2">
                  {e.title}
                </p>
              )}
              <ul className="space-y-1.5">
                {e.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-600/70 shrink-0 font-mono">▸</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
  );
}
