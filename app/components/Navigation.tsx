"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";


type Language = "de" | "en";

const labels = {
  de: {
    
    menu: "Menü öffnen",
    close: "Menü schließen",
    recipes: "Meine Rezepte",
    newRecipe: "Neues Rezept",
    pantry: "Wir haben Brot zu Hause",
    shopping: "Einkaufsliste",
    inspiration: "Inspiration",
    tags: "Tags",
    language: "Sprache",
  },
  en: {
   
    menu: "Open menu",
    close: "Close menu",
    recipes: "My Recipes",
    newRecipe: "New Recipe",
    pantry: "Pantry",
    shopping: "Shopping List",
    inspiration: "Inspiration",
    tags: "Tags",
    language: "Language",
  },
};

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("de");

  const t = labels[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("app-language");

    if (savedLanguage === "de" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    window.localStorage.setItem("app-language", newLanguage);

    window.dispatchEvent(
      new CustomEvent("language-change", {
        detail: newLanguage,
      })
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-950 text-white">
  <div className="relative mx-auto flex h-16 max-w-7xl items-center px-4">
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      aria-label={t.menu}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-800 text-2xl"
    >
      ☰
    </button>

    <Link
      href="/"
      aria-label="Zur Startseite"
      className="absolute left-1/2 -translate-x-1/2"
    >
      <Image
  src="/icon-512.png"
  alt="Logo"
  width={52}
  height={52}
  priority
  className="h-12 w-12 rounded-xl object-cover"
 />
    </Link>
  </div>
</header>

      {menuOpen && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label={t.close}
            className="fixed inset-0 z-50 bg-black/60"
          />

          <aside className="fixed inset-y-0 left-0 z-[60] flex w-80 max-w-[85%] flex-col bg-stone-950 text-white shadow-2xl">
            <div className="flex items-center justify-end border-b border-stone-800 p-5">
  <button
    type="button"
    onClick={() => setMenuOpen(false)}
    aria-label={t.close}
    className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-800 text-2xl"
  >
    ×
  </button>
</div>

            <nav className="flex-1 space-y-2 overflow-y-auto p-4">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.recipes}
              </Link>

              <Link
                href="/rezepte/neu"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.newRecipe}
              </Link>

              <Link
                href="/vorrat"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.pantry}
              </Link>

              <Link
                href="/einkaufsliste"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.shopping}
              </Link>

              <Link
                href="/inspiration"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.inspiration}
              </Link>

              <Link
                href="/tags"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 hover:bg-stone-800"
              >
                {t.tags}
              </Link>
            </nav>

            <div className="border-t border-stone-800 p-5">
              <p className="mb-3 text-sm text-stone-400">{t.language}</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => changeLanguage("de")}
                  className={`rounded-xl px-3 py-3 ${
                    language === "de"
                      ? "bg-green-700 text-white"
                      : "bg-stone-800 text-stone-300"
                  }`}
                >
                  Deutsch
                </button>

                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={`rounded-xl px-3 py-3 ${
                    language === "en"
                      ? "bg-green-700 text-white"
                      : "bg-stone-800 text-stone-300"
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}