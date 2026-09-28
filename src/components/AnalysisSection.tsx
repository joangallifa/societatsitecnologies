import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, ADMIN_EMAIL } from "../lib/supabase";
import type { Analysis, Entry } from "../types";
import { SAMR_OPTIONS, SAMR_DESCRIPTIONS, type SamrLevel } from "../lib/samr";
import { STEEP_FIELDS } from "../lib/steep";

type SteepValues = Record<(typeof STEEP_FIELDS)[number]["key"], string>;

const EMPTY_STEEP: SteepValues = {
  steep_social: "",
  steep_tecnologic: "",
  steep_economic: "",
  steep_ecologic: "",
  steep_politic: "",
};

export function AnalysisSection({
  entry,
  session,
  readOnly = false,
}: {
  entry: Entry;
  session: Session;
  readOnly?: boolean;
}) {
  const isAdmin = session.user.email === ADMIN_EMAIL;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [others, setOthers] = useState<Analysis[]>([]);
  const [samrLevel, setSamrLevel] = useState<SamrLevel | "">("");
  const [samrComment, setSamrComment] = useState("");
  const [steep, setSteep] = useState<SteepValues>(EMPTY_STEEP);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);

    supabase
      .from("analyses")
      .select("*, profiles(email)")
      .eq("entry_id", entry.id)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as Analysis[];
        const mine = rows.find((a) => a.author_id === session.user.id) ?? null;

        setOthers(
          isAdmin || readOnly
            ? rows.filter((a) => a.author_id !== session.user.id)
            : []
        );
        setSamrLevel(mine?.samr_level ?? "");
        setSamrComment(mine?.samr_comment ?? "");
        setSteep(
          mine
            ? {
                steep_social: mine.steep_social,
                steep_tecnologic: mine.steep_tecnologic,
                steep_economic: mine.steep_economic,
                steep_ecologic: mine.steep_ecologic,
                steep_politic: mine.steep_politic,
              }
            : EMPTY_STEEP
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry.id, session.user.id, isAdmin, readOnly]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    setSaved(false);

    if (!samrLevel || STEEP_FIELDS.some((field) => !steep[field.key].trim())) {
      setError("Tria un nivell SAMR i omple les cinc frases STEEP.");
      return;
    }

    setSaving(true);

    const payload = {
      entry_id: entry.id,
      author_id: session.user.id,
      samr_level: samrLevel,
      samr_comment: samrComment.trim(),
      steep_social: steep.steep_social.trim(),
      steep_tecnologic: steep.steep_tecnologic.trim(),
      steep_economic: steep.steep_economic.trim(),
      steep_ecologic: steep.steep_ecologic.trim(),
      steep_politic: steep.steep_politic.trim(),
    };

    const { error: saveError } = await supabase
      .from("analyses")
      .upsert(payload, { onConflict: "entry_id,author_id" });

    setSaving(false);

    if (saveError) {
      setError("No s'ha pogut desar l'anàlisi: " + saveError.message);
      return;
    }

    setSaved(true);
  }

  if (loading) {
    return <p className="mt-6 text-xs text-slate-400">Carregant l'anàlisi...</p>;
  }

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="text-sm font-semibold text-slate-800">
        La meva anàlisi SAMR i STEEP
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Aquesta anàlisi és privada: només tu i el professor la podeu veure.
      </p>
      {readOnly && (
        <p className="mt-2 text-xs font-medium text-amber-600">
          Aquesta activitat és ara mateix només de consulta.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="mb-3 block text-xs font-semibold text-slate-700">
            Nivell SAMR (Dr. Puentedura)
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SAMR_OPTIONS.map(([value, label]) => (
              <label
                key={value}
                className={`rounded-xl border p-3 text-xs shadow-sm transition ${
                  readOnly ? "cursor-default opacity-70" : "cursor-pointer"
                } ${
                  samrLevel === value
                    ? "border-accent-400 bg-accent-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="samr_level"
                    value={value}
                    checked={samrLevel === value}
                    disabled={readOnly}
                    onChange={() => setSamrLevel(value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="font-semibold text-slate-800">{label}</span>
                </span>
                <span className="mt-1 block text-slate-500">
                  {SAMR_DESCRIPTIONS[value]}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label
              htmlFor="samr_comment"
              className="mb-1 block text-[11px] font-medium text-slate-500"
            >
              Per què has triat aquest nivell? (opcional)
            </label>
            <textarea
              id="samr_comment"
              rows={2}
              maxLength={500}
              value={samrComment}
              disabled={readOnly}
              onChange={(e) => setSamrComment(e.target.value)}
              placeholder="Explica breument el raonament darrere del nivell triat..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="mb-3 block text-xs font-semibold text-slate-700">
            Anàlisi STEEP: una frase per àmbit
          </span>
          <div className="space-y-2.5">
            {STEEP_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={field.key}
                  className="mb-1 block text-[11px] font-medium text-slate-500"
                >
                  {field.label}
                </label>
                <input
                  id={field.key}
                  type="text"
                  maxLength={280}
                  value={steep[field.key]}
                  disabled={readOnly}
                  onChange={(e) =>
                    setSteep((current) => ({ ...current, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-xs font-medium text-emerald-600">Anàlisi desada.</p>
        )}

        {!readOnly && (
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-accent-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Desant..." : "Desa l'anàlisi"}
          </button>
        )}
      </form>

      {(isAdmin || readOnly) && others.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold text-slate-700">
            {isAdmin ? "Anàlisis de l'alumnat" : "Anàlisis dels companys"} (
            {others.length})
          </h4>
          <ul className="mt-3 space-y-3">
            {others.map((analysis) => (
              <li
                key={analysis.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-700">
                  {analysis.profiles?.email ?? "—"}
                  <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700">
                    {SAMR_OPTIONS.find(([v]) => v === analysis.samr_level)?.[1] ??
                      analysis.samr_level}
                  </span>
                </p>
                {analysis.samr_comment && (
                  <p className="mt-1 italic text-slate-500">
                    {analysis.samr_comment}
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-slate-600">
                  {STEEP_FIELDS.map((field) => (
                    <li key={field.key}>
                      <span className="font-medium text-slate-500">
                        {field.label}:
                      </span>{" "}
                      {analysis[field.key]}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
