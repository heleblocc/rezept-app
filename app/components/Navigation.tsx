"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Language = "de" | "en";

const labels = {
  de: {
    appName: "Meine Rezeptküche",
    recipes: "Meine Rezepte",
    pantry: "Wir haben Brot zu Hause",
    inspiration: "Inspiration",
    shopping: "Einkaufsliste",
    tags: "Tags",
  },
  en: {
    appName: "My Recipe Kitchen",
    recipes: "My Recipes",
    pantry: "We Have Food at Home",
    inspiration: "Inspiration",
    shopping: "Shopping List",
    tags: "Tags",
  },
};

export default function Navigation() {
  const pathname = usePathname();
  const [language, setLanguage] =
    useState<Language>("de");

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("app-language");

    if (savedLanguage === "de" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);

    localStorage.setItem(
      "app-language",
      newLanguage
    );

    window.dispatchEvent(
      new CustomEvent("language-change", {
        detail: newLanguage,
      })
    );
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  const navigationItems = [
    {
      href: "/",
      label: labels[language].recipes,
    },
    {
      href: "/vorrat",
      label: labels[language].pantry,
    },
    {
      href: "/inspiration",
      label: labels[language].inspiration,
    },
    {
      href: "/einkaufsliste",
      label: labels[language].shopping,
    },
    {
      href: "/tags",
      label: labels[language].tags,
    },
  ];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-stone-900"
        >
          {labels[language].appName}
        </Link>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => changeLanguage("de")}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                language === "de"
                  ? "bg-green-700 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              DE
            </button>

            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                language === "en"
                  ? "bg-green-700 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              EN
            </button>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-green-700 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
