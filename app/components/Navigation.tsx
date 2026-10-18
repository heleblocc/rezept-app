
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Language = "de" | "en";

const labels = {
  de: {
    home: "Home",
    recipes: "Rezepte",
    add: "Hinzufügen",
    shopping: "Einkauf",
    more: "Mehr",
    pantry: "Wir haben Brot zu Hause",
    inspiration: "Inspiration",
    tags: "Tags",
    language: "Sprache",
    close: "Menü schließen",
    menu: "Menü öffnen",
    account: "Mein Konto",
    login: "Anmelden",
    logout: "Abmelden",
    email: "E-Mail-Adresse",
    password: "Passwort",
    loggingIn: "Anmeldung läuft...",
    loggedInAs: "Angemeldet als",
    loginError: "Anmeldung fehlgeschlagen.",
    logoutError: "Abmeldung fehlgeschlagen.",
    loginHint: "Melde dich an, um deine privaten Rezepte zu sehen.",
  },
  en: {
    home: "Home",
    recipes: "Recipes",
    add: "Add",
    shopping: "Shopping",
    more: "More",
    pantry: "Pantry",
    inspiration: "Inspiration",
    tags: "Tags",
    language: "Language",
    close: "Close menu",
    menu: "Open menu",
    account: "My account",
    login: "Sign in",
    logout: "Sign out",
    email: "Email address",
    password: "Password",
    loggingIn: "Signing in...",
    loggedInAs: "Signed in as",
    loginError: "Sign-in failed.",
    logoutError: "Sign-out failed.",
    loginHint: "Sign in to see your private recipes.",
  },
};

type IconName =
  | "home"
  | "book"
  | "plus"
  | "shopping"
  | "menu";

function NavIcon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
        <path d="M9 21v-8h6v8" />
      </svg>
    );
  }

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M12 7v14" />
        <path d="M3 18V4a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H3Z" />
        <path d="M21 18V4a1 1 0 0 0-1-1h-5a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3h6Z" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "shopping") {
    return (
      <svg {...common}>
        <path d="m3 9 2 12h14l2-12H3Z" />
        <path d="m9 9 3-6 3 6" />
        <path d="M9 13v4M15 13v4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("de");

  // Anmeldung
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState("");

  const t = labels[language];

  // Sprache laden
  useEffect(() => {
    const saved = localStorage.getItem("app-language");

    if (saved === "de" || saved === "en") {
      setLanguage(saved);
    }
  }, []);

  // Anmeldung beim Start prüfen und Änderungen beobachten
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          console.warn("Sitzungsprüfung:", error.message);
        }

        setUserEmail(data.session?.user.email ?? null);
      } catch (error) {
        console.error("Sitzungsprüfung fehlgeschlagen:", error);

        if (active) {
          setUserEmail(null);
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setUserEmail(session?.user.email ?? null);
      setAuthChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Escape schließt das Menü
  useEffect(() => {
    if (!menuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  // Scrollen bei geöffnetem Menü verhindern
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("app-language", next);

    window.dispatchEvent(
      new CustomEvent("language-change", {
        detail: next,
      })
    );
  }

  // Mit bestehendem Supabase-Benutzer anmelden
  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authLoading) return;

    setAuthLoading(true);
    setAuthError("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Keine Sitzung erhalten.");
      }

      setUserEmail(data.user.email ?? email.trim());
      setPassword("");
      setMenuOpen(false);

      // Startseite und Daten nach Anmeldung aktualisieren
      window.location.assign("/");
    } catch (error) {
      console.error("Anmeldung fehlgeschlagen:", error);

      setAuthError(
        error instanceof Error
          ? error.message
          : t.loginError
      );
    } finally {
      setAuthLoading(false);
    }
  }

  // Abmelden
  async function handleLogout() {
    if (authLoading) return;

    setAuthLoading(true);
    setAuthError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setUserEmail(null);
      setEmail("");
      setPassword("");
      setMenuOpen(false);

      window.location.assign("/");
    } catch (error) {
      console.error("Abmeldung fehlgeschlagen:", error);

      setAuthError(
        error instanceof Error
          ? error.message
          : t.logoutError
      );
    } finally {
      setAuthLoading(false);
    }
  }

  const items: {
    label: string;
    href?: string;
    icon: IconName;
    action?: () => void;
  }[] = [
    {
      label: t.home,
      href: "/",
      icon: "home",
    },
    {
      label: t.recipes,
      href: "/",
      icon: "book",
    },
    {
      label: t.add,
      href: "/rezepte/neu",
      icon: "plus",
    },
    {
      label: t.shopping,
      href: "/einkaufsliste",
      icon: "shopping",
    },
    {
      label: t.more,
      icon: "menu",
      action: () => setMenuOpen(true),
    },
  ];

  const menuLinks = [
    { label: t.recipes, href: "/" },
    { label: t.add, href: "/rezepte/neu" },
    { label: t.pantry, href: "/vorrat" },
    { label: t.shopping, href: "/einkaufsliste" },
    { label: t.inspiration, href: "/inspiration" },
    { label: t.tags, href: "/tags" },
  ];

  return (
    <>
      {/* OBERE NAVIGATIONSLEISTE */}
      <header className="sticky top-0 z-40 border-b border-[#E8E5DF] bg-[#F6F4F0]/95 backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Menü links */}
          <button
            type="button"
            onClick={() => {
              setAuthError("");
              setMenuOpen(true);
            }}
            aria-label={t.menu}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#526655] transition hover:bg-[#EBE8E2]"
          >
            <NavIcon name="menu" size={21} />
          </button>

          {/* Logo mittig */}
          <Link
            href="/"
            aria-label="Zur Startseite"
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          >
            <img
              src="/icon-512.png"
              alt="Schmausarchiv Logo"
              width={40}
              height={40}
              className="block h-10 w-10 object-contain"
            />
          </Link>

          {/* Desktop-Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className={`text-sm font-medium transition hover:text-[#526655] ${
                pathname === "/"
                  ? "text-[#526655]"
                  : "text-[#858780]"
              }`}
            >
              {t.recipes}
            </Link>

            <Link
              href="/einkaufsliste"
              className={`text-sm font-medium transition hover:text-[#526655] ${
                pathname === "/einkaufsliste"
                  ? "text-[#526655]"
                  : "text-[#858780]"
              }`}
            >
              {t.shopping}
            </Link>
          </div>

          <div className="w-10 md:hidden" />
        </div>
      </header>

      {/* MOBILE NAVIGATION UNTEN */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E5DF] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_16px_rgba(41,43,37,0.04)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 items-center px-2">
          {items.map((item, index) => {
            const active =
              item.icon === "book"
                ? false
                : item.href === "/"
                  ? pathname === "/"
                  : item.href
                    ? pathname.startsWith(item.href)
                    : false;

            if (item.href) {
              return (
                <Link
                  key={`${item.icon}-${index}`}
                  href={item.href}
                  className="flex min-w-0 flex-col items-center justify-center gap-1"
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon === "plus" ? (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#526655] text-white shadow-sm transition hover:bg-[#3D5041]">
                      <NavIcon name="plus" size={24} />
                    </span>
                  ) : (
                    <>
                      <span
                        className={
                          active
                            ? "text-[#526655]"
                            : "text-[#858780]"
                        }
                      >
                        <NavIcon name={item.icon} size={21} />
                      </span>

                      <span
                        className={`truncate text-[10px] ${
                          active
                            ? "font-semibold text-[#526655]"
                            : "text-[#858780]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </Link>
              );
            }

            return (
              <button
                key={`${item.icon}-${index}`}
                type="button"
                onClick={item.action}
                aria-label={item.label}
                aria-expanded={menuOpen}
                className="flex min-w-0 flex-col items-center justify-center gap-1 text-[#858780]"
              >
                <NavIcon name={item.icon} size={21} />
                <span className="text-[10px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* HINTERGRUND BEI GEÖFFNETEM MENÜ */}
      <button
        type="button"
        onClick={() => setMenuOpen(false)}
        aria-label={t.close}
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        className={`fixed inset-0 z-50 bg-[#292B29]/35 transition-opacity duration-300 ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* SEITENMENÜ */}
      <aside
        role="dialog"
        aria-modal={menuOpen ? true : undefined}
        aria-label={t.menu}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-y-0 left-0 z-[60] flex w-80 max-w-[85%] flex-col bg-[#F6F4F0] shadow-xl transition-transform duration-300 ease-out ${
          menuOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full"
        }`}
      >
        {/* MENÜKOPF */}
        <div className="flex items-center justify-between border-b border-[#E8E5DF] px-5 py-5">
          <div>
            <span className="font-elegant text-2xl font-medium text-[#526655]">
              Schmausarchiv
            </span>

            <p className="mt-1 text-xs text-[#858780]">
              Mahlzeit, Majestät!
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label={t.close}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EBE8E2] text-xl text-[#526655] transition hover:bg-[#E0DDD6]"
          >
            ×
          </button>
        </div>

        {/* MENÜLINKS */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuLinks.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#E5EAE3] text-[#526655]"
                    : "text-[#292B29] hover:bg-[#EBE8E2]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* KONTO UND ANMELDUNG */}
        <div className="border-t border-[#E8E5DF] p-5">
          <p className="mb-3 text-sm font-semibold text-[#292B29]">
            {t.account}
          </p>

          {authChecking ? (
            <p className="text-xs text-[#858780]">
              ...
            </p>
          ) : userEmail ? (
            <div className="space-y-3">
              <p className="text-xs text-[#858780]">
                {t.loggedInAs}
              </p>

              <p className="break-all text-sm font-medium text-[#526655]">
                {userEmail}
              </p>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={authLoading}
                className="w-full rounded-xl border border-[#E8E5DF] bg-white px-4 py-3 text-sm font-medium text-[#526655] transition hover:bg-[#EBE8E2] disabled:opacity-50"
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleLogin}
              className="space-y-3"
            >
              <p className="text-xs text-[#858780]">
                {t.loginHint}
              </p>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder={t.email}
                aria-label={t.email}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 text-sm text-[#292B29] outline-none focus:border-[#526655]"
              />

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder={t.password}
                aria-label={t.password}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 text-sm text-[#292B29] outline-none focus:border-[#526655]"
              />

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-[#526655] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#3D5041] disabled:opacity-50"
              >
                {authLoading
                  ? t.loggingIn
                  : t.login}
              </button>
            </form>
          )}

          {authError && (
            <p
              role="alert"
              className="mt-3 text-xs text-red-700"
            >
              {authError}
            </p>
          )}
        </div>

        {/* SPRACHEINSTELLUNGEN */}
        <div className="border-t border-[#E8E5DF] p-5">
          <p className="mb-3 text-sm font-medium text-[#858780]">
            {t.language}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(["de", "en"] as Language[]).map(
              (lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() =>
                    changeLanguage(lang)
                  }
                  aria-pressed={
                    language === lang
                  }
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    language === lang
                      ? "bg-[#526655] text-white"
                      : "border border-[#E8E5DF] bg-white text-[#526655] hover:bg-[#EBE8E2]"
                  }`}
                >
                  {lang === "de"
                    ? "Deutsch"
                    : "English"}
                </button>
              )
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
