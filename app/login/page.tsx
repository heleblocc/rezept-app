
"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "register") {
        const { data, error: authError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage(
            "Bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach. Danach kannst du dich anmelden."
          );
        }
      } else {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Etwas ist schiefgelaufen."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F4F0] px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#526655] hover:underline"
        >
          ← Zurück zum Schmausarchiv
        </Link>

        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-7 shadow-sm sm:p-9">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#858780]">
              Mahlzeit, Majestät!
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#292B29]">
              Schmausarchiv
            </h1>

            <p className="mt-3 text-sm text-[#858780]">
              {mode === "login"
                ? "Willkommen zurück in deiner Rezeptsammlung."
                : "Erstelle dein persönliches Rezeptarchiv."}
            </p>
          </div>

          <div className="mb-7 grid grid-cols-2 rounded-xl bg-[#F6F4F0] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-white text-[#3D5041] shadow-sm"
                  : "text-[#858780]"
              }`}
            >
              Anmelden
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-white text-[#3D5041] shadow-sm"
                  : "text-[#858780]"
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#292B29]"
              >
                E-Mail-Adresse
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="deine@email.de"
                className="w-full rounded-xl border border-[#E8E5DF] bg-white px-4 py-3 text-[#292B29] outline-none focus:border-[#526655]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#292B29]"
              >
                Passwort
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mindestens 6 Zeichen"
                className="w-full rounded-xl border border-[#E8E5DF] bg-white px-4 py-3 text-[#292B29] outline-none focus:border-[#526655]"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl bg-[#E5EAE3] p-3 text-sm text-[#3D5041]"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#526655] px-5 py-3.5 font-medium text-white transition hover:bg-[#3D5041] disabled:opacity-50"
            >
              {loading
                ? "Bitte warten..."
                : mode === "login"
                  ? "Anmelden"
                  : "Konto erstellen"}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-relaxed text-[#858780]">
            Deine Rezepte. Dein Archiv. Dein Geschmack.
          </p>
        </div>
      </div>
    </main>
  );
}
