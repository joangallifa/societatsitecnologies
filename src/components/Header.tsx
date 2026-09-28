import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { supabase, ADMIN_EMAIL } from "../lib/supabase";
import { LINIA_TEMPS_PHASE_MESSAGES } from "../lib/appSettings";
import type { AppStatus } from "../lib/appSettings";

type View = "timeline" | "new" | "login" | "admin";

export function Header({
  session,
  view,
  readOnly = false,
  phaseStatus = null,
  onNavigate,
  onAddNew,
}: {
  session: Session | null;
  view: View;
  readOnly?: boolean;
  phaseStatus?: AppStatus | null;
  onNavigate: (view: View) => void;
  onAddNew: () => void;
}) {
  const isAdmin = session?.user.email === ADMIN_EMAIL;
  const phaseMessage = phaseStatus ? LINIA_TEMPS_PHASE_MESSAGES[phaseStatus] : undefined;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/"
            title="Torna a l'inici"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ←
          </Link>
          <button
            onClick={() => onNavigate("timeline")}
            className="flex items-center gap-2"
          >
            <span className="text-xl">🕰️</span>
            <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:inline">
              Línia del temps tecnològica
            </span>
          </button>
          {phaseMessage && (
            <span className="rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-800">
              {phaseMessage}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {session ? (
            <>
              {isAdmin && (
                <button
                  onClick={() => onNavigate("admin")}
                  className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                >
                  Administració
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={onAddNew}
                  className="rounded-full bg-accent-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600 sm:px-4"
                >
                  <span className="sm:hidden">+ Afegir</span>
                  <span className="hidden sm:inline">+ Afegir tecnologia</span>
                </button>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 sm:px-4"
              >
                Surt
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate(view === "login" ? "timeline" : "login")}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Inicia sessió
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
