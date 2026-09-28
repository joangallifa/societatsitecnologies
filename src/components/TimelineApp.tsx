import { useCallback, useEffect, useState } from "react";
import { supabase, ADMIN_EMAIL } from "../lib/supabase";
import { deleteEntry } from "../lib/entries";
import { useSession } from "../hooks/useSession";
import { useAppStatus } from "../hooks/useAppStatus";
import type { Entry } from "../types";
import { Header } from "./Header";
import { Timeline } from "./Timeline";
import { LoginForm } from "./LoginForm";
import { EntryForm } from "./EntryForm";
import { AdminPage } from "./AdminPage";
import { AppUnavailable } from "./AppUnavailable";

type View = "timeline" | "new" | "login" | "admin";

export function TimelineApp() {
  const { session, loading: sessionLoading } = useSession();
  const { status: appStatus, loading: statusLoading } = useAppStatus("linia-temps");
  const [view, setView] = useState<View>("timeline");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    const { data, error } = await supabase
      .from("entries")
      .select("*, profiles(email)")
      .order("year", { ascending: true });

    if (error) {
      setEntriesError(error.message);
    } else {
      setEntries(data as Entry[]);
      setEntriesError(null);
    }
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (session && view === "login") {
      setView("timeline");
    }
    if (
      !sessionLoading &&
      view === "admin" &&
      session?.user.email !== ADMIN_EMAIL
    ) {
      setView("timeline");
    }
    if (view !== "new") {
      setEditingEntry(null);
    }
  }, [session, sessionLoading, view]);

  async function handleDelete(entry: Entry) {
    const errorMessage = await deleteEntry(entry);
    if (errorMessage) {
      window.alert("No s'ha pogut eliminar: " + errorMessage);
      return;
    }
    setEntries((current) => current.filter((e) => e.id !== entry.id));
  }

  const isAdmin = session?.user.email === ADMIN_EMAIL;

  if (!sessionLoading && !statusLoading && appStatus === "OCULT" && !isAdmin) {
    return <AppUnavailable />;
  }

  // Les tecnologies només es poden editar/esborrar durant la fase "Editar
  // tecnologies" (i mentre l'app és oculta, per preparar contingut); en
  // "només consulta" i "Editar metodologies" ningú les pot tocar, ni tan
  // sols l'administrador.
  const entriesLocked =
    appStatus === "CONSULTA" || appStatus === "EDITAR_METODOLOGIES";
  // Les metodologies (SAMR/STEEP) no es mostren durant "Editar tecnologies";
  // un cop visibles, només es poden editar durant "Editar metodologies".
  const showAnalysis = appStatus !== "EDITAR_TECNOLOGIES";
  const analysisReadOnly = appStatus === "CONSULTA";

  return (
    <div className="min-h-screen text-slate-900">
      <Header
        session={session}
        view={view}
        readOnly={entriesLocked}
        phaseStatus={appStatus}
        onNavigate={setView}
        onAddNew={() => {
          setEditingEntry(null);
          setView("new");
        }}
      />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        {view === "login" && !session && <LoginForm />}

        {view === "new" && session && !entriesLocked && (
          <div className="mx-auto max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {editingEntry ? "Editar la tecnologia" : "Afegir una tecnologia"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {editingEntry
                ? "Actualitza la informació d'aquesta entrada."
                : "Comparteix una tecnologia rellevant de la història amb la resta de la classe."}
            </p>
            <EntryForm
              session={session}
              entry={editingEntry ?? undefined}
              onSaved={() => {
                setView("timeline");
                loadEntries();
              }}
            />
          </div>
        )}

        {view === "admin" && session?.user.email === ADMIN_EMAIL && (
          <AdminPage entries={entries} onDelete={handleDelete} readOnly={entriesLocked} />
        )}

        {view === "timeline" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Tecnologies al llarg de la història
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {entries.length}{" "}
                {entries.length === 1
                  ? "tecnologia afegida"
                  : "tecnologies afegides"}{" "}
                per la classe.
              </p>
            </div>

            {entriesLoading || sessionLoading ? (
              <p className="text-sm text-slate-400">Carregant...</p>
            ) : entriesError ? (
              <p className="text-sm text-red-600">
                No s&apos;han pogut carregar les entrades: {entriesError}
              </p>
            ) : (
              <Timeline
                entries={entries}
                session={session}
                entriesLocked={entriesLocked}
                showAnalysis={showAnalysis}
                analysisReadOnly={analysisReadOnly}
                onDelete={handleDelete}
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setView("new");
                }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
