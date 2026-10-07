import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import { useAppStatus } from "../hooks/useAppStatus";
import type { Analysis, Entry } from "../types";
import { ERA_LABELS } from "../lib/era";
import { formatYear, authorLabel } from "../lib/entryDisplay";
import { toDisplayHtml } from "../lib/richText";
import { SAMR_LABELS, SAMR_DESCRIPTIONS } from "../lib/samr";
import { STEEP_FIELDS } from "../lib/steep";

export function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: sessionLoading } = useSession();
  const { status: appStatus } = useAppStatus("linia-temps");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const { data: entryData, error: entryError } = await supabase
        .from("entries")
        .select("*, profiles(email)")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (entryError) {
        setError(entryError.message);
        setLoading(false);
        return;
      }
      setEntry(entryData as Entry | null);

      // Només es llegeixen amb sessió; la base de dades limita quines
      // anàlisis es veuen (les pròpies, o totes en mode consulta/admin).
      if (entryData && session) {
        const { data: rows, error: analysesError } = await supabase
          .from("analyses")
          .select("*, profiles(email)")
          .eq("entry_id", id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (analysesError) setError(analysesError.message);
        else setAnalyses((rows ?? []) as Analysis[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, session, sessionLoading]);

  const showAnalyses = appStatus !== "EDITAR_TECNOLOGIES";

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200/70 bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3 sm:px-6">
          <Link
            to="/linia-temps"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Torna a la línia del temps
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        {loading || sessionLoading ? (
          <p className="text-sm text-slate-400">Carregant...</p>
        ) : error ? (
          <p className="text-sm text-red-600">No s&apos;ha pogut carregar: {error}</p>
        ) : !entry ? (
          <p className="text-sm text-slate-500">Aquesta tecnologia no existeix.</p>
        ) : (
          <article>
            <img
              src={entry.photo_url}
              alt={entry.title}
              className="h-64 w-full rounded-3xl object-cover sm:h-80"
            />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
                {formatYear(entry.year)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {ERA_LABELS[entry.era]}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {entry.title}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Afegida per {authorLabel(entry)}
            </p>
            <div
              className="rich-text mt-4 text-sm leading-relaxed text-slate-600"
              dangerouslySetInnerHTML={{ __html: toDisplayHtml(entry.description) }}
            />

            {showAnalyses && (
              <section className="mt-10 border-t border-slate-100 pt-6">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Aportacions SAMR i STEEP ({analyses.length})
                </h2>
                {!session ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Inicia sessió per veure les aportacions.
                  </p>
                ) : analyses.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Encara no hi ha aportacions visibles.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {analyses.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                      >
                        <p className="font-semibold text-slate-800">
                          {a.profiles?.email.split("@")[0] ?? "—"}
                        </p>
                        <p className="mt-2">
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            SAMR: {SAMR_LABELS[a.samr_level]}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            {SAMR_DESCRIPTIONS[a.samr_level]}
                          </span>
                        </p>
                        {a.samr_comment && (
                          <p className="mt-2 italic text-slate-500">{a.samr_comment}</p>
                        )}
                        <ul className="mt-3 space-y-1 text-slate-600">
                          {STEEP_FIELDS.map((field) => (
                            <li key={field.key}>
                              <span className="font-medium text-slate-500">
                                {field.label}:
                              </span>{" "}
                              {a[field.key]}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
