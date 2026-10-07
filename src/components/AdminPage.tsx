import { useState } from "react";
import { Link } from "react-router-dom";
import type { Entry } from "../types";
import { ERA_OPTIONS, ERA_COLORS, type Era } from "../lib/era";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ca-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminPage({
  entries,
  onDelete,
  readOnly = false,
}: {
  entries: Entry[];
  onDelete: (entry: Entry) => Promise<void>;
  readOnly?: boolean;
}) {
  const [author, setAuthor] = useState("");

  const countsByAuthor = new Map<string, number>();
  for (const entry of entries) {
    const email = entry.profiles?.email;
    if (!email) continue;
    countsByAuthor.set(email, (countsByAuthor.get(email) ?? 0) + 1);
  }
  const authors = Array.from(countsByAuthor.keys()).sort();

  const authorStats = Array.from(countsByAuthor.entries())
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count || a.email.localeCompare(b.email));
  const maxAuthorCount = Math.max(1, ...authorStats.map((a) => a.count));

  const eraCounts: Partial<Record<Era, number>> = {};
  for (const entry of entries) {
    eraCounts[entry.era] = (eraCounts[entry.era] ?? 0) + 1;
  }
  const maxEraCount = Math.max(1, ...Object.values(eraCounts));

  const filtered = author
    ? entries.filter((entry) => entry.profiles?.email === author)
    : entries;

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Administració
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} de {entries.length} entrades, ordenades per data
            de creació.
          </p>
          <Link
            to="/linia-temps/resum"
            className="mt-3 inline-block rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Veure el resum d&apos;anàlisis (taula)
          </Link>
        </div>

        {authors.length > 0 && (
          <div>
            <label
              htmlFor="author-filter"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Filtra per creador
            </label>
            <select
              id="author-filter"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
            >
              <option value="">Tots els creadors ({entries.length})</option>
              {authors.map((email) => (
                <option key={email} value={email}>
                  {email} ({countsByAuthor.get(email)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              Entrades per època
            </h2>
            <ul className="mt-3 space-y-2">
              {ERA_OPTIONS.map(([era, label]) => {
                const count = eraCounts[era] ?? 0;
                const pct = (count / maxEraCount) * 100;
                return (
                  <li key={era} className="flex items-center gap-2">
                    <span className="w-28 flex-shrink-0 truncate text-xs text-slate-600">
                      {label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${ERA_COLORS[era].pill} ${
                          count === 0 ? "opacity-20" : ""
                        }`}
                        style={{ width: `${count === 0 ? 100 : pct}%` }}
                      />
                    </div>
                    <span className="w-5 flex-shrink-0 text-right text-xs font-semibold text-slate-700">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              Entrades per alumne
            </h2>
            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
              {authorStats.map(({ email, count }) => (
                <li key={email} className="flex items-center gap-2">
                  <span
                    className="w-28 flex-shrink-0 truncate text-xs text-slate-600"
                    title={email}
                  >
                    {email.split("@")[0]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent-500"
                      style={{ width: `${(count / maxAuthorCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 flex-shrink-0 text-right text-xs font-semibold text-slate-700">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">
          {entries.length === 0
            ? "Encara no hi ha cap entrada."
            : "Cap entrada d'aquest creador."}
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((entry) => (
            <AdminRow
              key={entry.id}
              entry={entry}
              onDelete={onDelete}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminRow({
  entry,
  onDelete,
  readOnly,
}: {
  entry: Entry;
  onDelete: (entry: Entry) => Promise<void>;
  readOnly: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Eliminar "${entry.title}" (${entry.profiles?.email})?`))
      return;
    setDeleting(true);
    await onDelete(entry);
  }

  return (
    <li className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <img
        src={entry.photo_url}
        alt={entry.title}
        className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {entry.title}{" "}
          <span className="font-normal text-slate-400">({entry.year})</span>
        </p>
        <p className="truncate text-xs text-slate-500">
          {entry.profiles?.email ?? "—"} · {formatDate(entry.created_at)}
        </p>
      </div>
      {!readOnly && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? "Eliminant..." : "Eliminar"}
        </button>
      )}
    </li>
  );
}
