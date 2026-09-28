import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Step = "email" | "code";

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    setStatus("loading");

    const { error } = await supabase.auth.signInWithOtp({ email: trimmed });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setStatus("idle");
    setStep("code");
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    // En cas d'èxit, useSession() detecta la nova sessió automàticament.
  }

  if (step === "code") {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Introdueix el codi
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          T&apos;hem enviat un codi de 6 xifres a <strong>{email}</strong>.
          Revisa també la carpeta de spam.
        </p>

        <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="code"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Codi
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="123456"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setStatus("idle");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-center text-lg tracking-[0.3em] shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
          >
            {status === "loading" ? "Comprovant..." : "Entra"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setStatus("idle");
            }}
            className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Fer servir un altre correu
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Inicia sessió
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Introdueix el teu correu electrònic i et enviarem un codi
        d&apos;accés.
      </p>

      <form onSubmit={handleSendCode} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Correu electrònic
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="nom.cognom@exemple.cat"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
        >
          {status === "loading" ? "Enviant..." : "Envia el codi"}
        </button>
      </form>
    </div>
  );
}
