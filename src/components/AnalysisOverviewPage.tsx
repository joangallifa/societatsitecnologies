import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, ADMIN_EMAIL } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import type { Analysis, Entry } from "../types";
import { formatYear } from "../lib/entryDisplay";
import { SAMR_LABELS } from "../lib/samr";
import { STEEP_FIELDS } from "../lib/steep";

function studentName(a: Analysis) {
  return a.profiles?.email.split("@")[0] ?? "—";
}

export function AnalysisOverviewPage() {
  const { session, loading: sessionLoading } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      const [entriesRes, analysesRes] = await Promise.all([
        supabase
          .from("entries")
          .select("*, profiles(email)")
          .order("year", { ascending: true }),
        supabase
          .from("analyses")
          .select("*, profiles(email)")
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const failure = entriesRes.error ?? analysesRes.error;
      if (failure) setError(failure.message);
      else {
        setEntries((entriesRes.data ?? []) as Entry[]);
        setAnalyses((analysesRes.data ?? []) as Analysis[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (sessionLoading) {
    return <p className="p-8 text-sm text-slate-400">Carregant...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-slate-500">
          Aquesta pàgina només és accessible per a l&apos;administrador.
        </p>
        <Link
          to="/linia-temps"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Torna a la línia del temps
        </Link>
      </div>
    );
  }

  const byEntry = new Map<string, Analysis[]>();
  for (const a of analyses) {
    const list = byEntry.get(a.entry_id) ?? [];
    list.push(a);
    byEntry.set(a.entry_id, list);
  }

  const cell = "border border-slate-200 px-3 py-2 align-top";

  return (
    <div className="min-h-screen px-4 py-6 text-slate-900 sm:px-6">
      <Link
        to="/linia-temps"
        className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Torna a la línia del temps
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Resum de tecnologies i anàlisis
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {entries.length} tecnologies · {analyses.length} anàlisis SAMR i STEEP.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Carregant...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1400px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className={cell}>Tecnologia</th>
                <th className={cell}>Estudiant</th>
                <th className={cell}>SAMR</th>
                <th className={cell}>Comentari SAMR</th>
                {STEEP_FIELDS.map((f) => (
                  <th key={f.key} className={cell}>
                    STEEP · {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const rows = byEntry.get(entry.id) ?? [];
                const title = (
                  <td className={cell} rowSpan={Math.max(1, rows.length)}>
                    <Link
                      to={`/linia-temps/tecnologia/${entry.id}`}
                      className="font-semibold text-slate-800 hover:underline"
                    >
                      {entry.title}
                    </Link>
                    <div className="text-slate-400">{formatYear(entry.year)}</div>
                  </td>
                );
                if (rows.length === 0) {
                  return (
                    <tr key={entry.id}>
                      {title}
                      <td
                        className={`${cell} italic text-slate-400`}
                        colSpan={3 + STEEP_FIELDS.length}
                      >
                        Cap anàlisi encara
                      </td>
                    </tr>
                  );
                }
                return (
                  <Fragment key={entry.id}>
                    {rows.map((a, i) => (
                      <tr key={a.id}>
                        {i === 0 && title}
                        <td className={`${cell} font-medium`}>{studentName(a)}</td>
                        <td className={cell}>{SAMR_LABELS[a.samr_level]}</td>
                        <td className={cell}>{a.samr_comment}</td>
                        {STEEP_FIELDS.map((f) => (
                          <td key={f.key} className={cell}>
                            {a[f.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
