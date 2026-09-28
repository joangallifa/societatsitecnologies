import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase, ADMIN_EMAIL } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import { useAppStatus } from "../hooks/useAppStatus";
import type { Definition } from "../types";
import { LoginForm } from "./LoginForm";
import { AppUnavailable } from "./AppUnavailable";
import { RichTextEditor } from "./RichTextEditor";
import { sanitizeHtml, htmlToText, toDisplayHtml } from "../lib/richText";

type View = "meva" | "admin";

function TopBar({
  session,
  isAdmin,
  view,
  onNavigate,
}: {
  session: Session | null;
  isAdmin: boolean;
  view: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            title="Torna a l'inici"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ←
          </Link>
          <button
            onClick={() => onNavigate("meva")}
            className="flex items-center gap-2"
          >
            <span className="text-xl">📖</span>
            <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:inline">
              Definicions de tecnologia
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isAdmin && (
            <button
              onClick={() => onNavigate(view === "admin" ? "meva" : "admin")}
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Administració
            </button>
          )}
          {session && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Surt
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function DefinitionsApp() {
  const { session, loading: sessionLoading } = useSession();
  const { status: appStatus, loading: statusLoading } = useAppStatus("definicions");
  const [view, setView] = useState<View>("meva");

  if (sessionLoading || statusLoading) {
    return (
      <div className="min-h-screen text-slate-900">
        <TopBar session={null} isAdmin={false} view={view} onNavigate={setView} />
        <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
          <p className="text-sm text-slate-400">Carregant...</p>
        </main>
      </div>
    );
  }

  const isAdmin = session?.user.email === ADMIN_EMAIL;

  if (appStatus === "OCULT" && !isAdmin) {
    return <AppUnavailable />;
  }

  const readOnly = appStatus === "CONSULTA" && !isAdmin;

  return (
    <div className="min-h-screen text-slate-900">
      <TopBar session={session} isAdmin={isAdmin} view={view} onNavigate={setView} />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        {!session && <LoginForm />}

        {session && isAdmin && view === "admin" && (
          <DefinitionsRoster excludeUserId={session.user.id} />
        )}

        {session && isAdmin && view === "meva" && (
          <MyDefinition userId={session.user.id} />
        )}

        {session && !isAdmin && readOnly && <DefinitionsRoster />}

        {session && !isAdmin && !readOnly && (
          <MyDefinition userId={session.user.id} />
        )}
      </main>
    </div>
  );
}

function MyDefinition({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initial, setInitial] = useState("");
  const [final, setFinal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from("definitions")
      .select("*")
      .eq("author_id", userId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }
        const row = data as Definition | null;
        setInitial(row?.initial_definition ?? "");
        setFinal(row?.final_definition ?? "");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const initialHtml = sanitizeHtml(initial);
    const finalHtml = sanitizeHtml(final);

    const { error: saveError } = await supabase.from("definitions").upsert(
      {
        author_id: userId,
        initial_definition: htmlToText(initialHtml) ? initialHtml : null,
        final_definition: htmlToText(finalHtml) ? finalHtml : null,
      },
      { onConflict: "author_id" }
    );

    setSaving(false);

    if (saveError) {
      setError("No s'ha pogut desar la definició: " + saveError.message);
      return;
    }

    setSaved(true);
  }

  if (loading) return <p className="text-sm text-slate-400">Carregant...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        La meva definició de tecnologia
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Aquesta activitat és privada: només tu i el professor la podeu veure.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Definició inicial
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Abans de llegir el document: què entens per "tecnologia"?
          </p>
          <RichTextEditor
            value={initial}
            onChange={setInitial}
            placeholder="La meva definició de tecnologia és..."
            minHeightClassName="min-h-[220px]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Definició després de llegir el document
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Ara que has llegit el document: com definiries "tecnologia"?
          </p>
          <RichTextEditor
            value={final}
            onChange={setFinal}
            placeholder="Després de llegir el document, defineixo tecnologia com..."
            minHeightClassName="min-h-[220px]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-sm font-medium text-emerald-600">
            Definició desada.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
        >
          {saving ? "Desant..." : "Desa la definició"}
        </button>
      </form>
    </div>
  );
}

function DefinitionsRoster({ excludeUserId }: { excludeUserId?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Definition[]>([]);

  useEffect(() => {
    supabase
      .from("definitions")
      .select("*, profiles(email)")
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }
        const sorted = ((data ?? []) as Definition[])
          .filter((row) => row.author_id !== excludeUserId)
          .sort((a, b) =>
            (a.profiles?.email ?? "").localeCompare(b.profiles?.email ?? "")
          );
        setRows(sorted);
        setLoading(false);
      });
  }, [excludeUserId]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Definicions de la classe
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {rows.length} {rows.length === 1 ? "alumne ha" : "alumnes han"}{" "}
        escrit alguna definició.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Carregant...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">
          No s&apos;han pogut carregar les definicions: {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          Encara ningú ha escrit cap definició.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm font-semibold text-slate-800">
                {row.profiles?.email ?? "—"}
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Definició inicial
                  </p>
                  {row.initial_definition ? (
                    <div
                      className="rich-text mt-1.5 text-sm leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: toDisplayHtml(row.initial_definition),
                      }}
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-400">
                      — sense resposta —
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Definició posterior
                  </p>
                  {row.final_definition ? (
                    <div
                      className="rich-text mt-1.5 text-sm leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: toDisplayHtml(row.final_definition),
                      }}
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-400">
                      — sense resposta —
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
