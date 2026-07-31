"use client";

import { createWorker } from "tesseract.js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecipes } from "@/lib/recipes";
import { supabase } from "@/lib/supabase";

type Ingredient = {
  amount: string;
  unit: string;
  name: string;
};

type Recipe = {
  id: number;
  title: string;
  ingredients: Ingredient[];
  instructions: string;
  tags: string[];
  favorite?: boolean;
  rating?: number;
  cookingTime?: number;
  image?: string;
};

const texts = {
  de: {
    newRecipe: "Neues Rezept",
    searchPlaceholder: "Nach Rezepten oder Zutaten suchen...",
    favoritesOnly: "Nur Favoriten",
    all: "Alle",
    noRecipes: "Keine passenden Rezepte gefunden.",
    ingredients: "Zutaten",
    cookingTime: "Min.",
    noCookingTime: "Keine Zeitangabe",
    openRecipe: "Öffnen",
    delete: "Löschen",
    deleteQuestion: "Möchtest du dieses Rezept wirklich löschen?",
    favoriteLabel: "Favorit ändern",
    ratingLabel: "Sterne vergeben",
    imagePlaceholder: "Kein Rezeptbild vorhanden",
  },
  en: {
    newRecipe: "New Recipe",
    searchPlaceholder: "Search recipes or ingredients...",
    favoritesOnly: "Favorites only",
    all: "All",
    noRecipes: "No matching recipes found.",
    ingredients: "ingredients",
    cookingTime: "min.",
    noCookingTime: "No time specified",
    openRecipe: "Open",
    delete: "Delete",
    deleteQuestion: "Do you really want to delete this recipe?",
    favoriteLabel: "Change favorite",
    ratingLabel: "stars",
    imagePlaceholder: "No recipe image available",
  },
};

export default function Home() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [language, setLanguage] = useState<"de" | "en">("de");

  const t = texts[language];

useEffect(() => {
  async function loadRecipes() {
    try {
      const loadedRecipes = await getRecipes();
      setRecipes(loadedRecipes);
    } catch (error) {
      console.error("Rezepte konnten nicht geladen werden:", error);
    }
  }

  loadRecipes();
}, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("app-language");

    if (savedLanguage === "de" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<"de" | "en">;

      if (customEvent.detail === "de" || customEvent.detail === "en") {
        setLanguage(customEvent.detail);
      }
    }

    window.addEventListener("language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("language-change", handleLanguageChange);
    };
  }, []);

  const allTags = useMemo(() => {
    return Array.from(
      new Set(recipes.flatMap((recipe) => recipe.tags ?? []))
    ).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.title.toLowerCase().includes(normalizedSearch) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLowerCase().includes(normalizedSearch)
        );

      const matchesTag =
        selectedTag === "" || recipe.tags?.includes(selectedTag);

      const matchesFavorite =
        !showFavoritesOnly || recipe.favorite === true;

      return matchesSearch && matchesTag && matchesFavorite;
    });
  }, [recipes, search, selectedTag, showFavoritesOnly]);

  function saveRecipes(updatedRecipes: Recipe[]) {
    setRecipes(updatedRecipes);
    localStorage.setItem("recipes", JSON.stringify(updatedRecipes));
  }

async function toggleFavorite(id: number) {
  const recipe = recipes.find((recipe) => recipe.id === id);

  if (!recipe) return;

  const newFavorite = !recipe.favorite;

  try {
    const { error } = await supabase
      .from("recipes")
      .update({
        favorite: newFavorite,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === id
          ? {
              ...recipe,
              favorite: newFavorite,
            }
          : recipe
      )
    );
  } catch (error) {
    console.error("Favorit konnte nicht gespeichert werden:", error);
    alert("Favorit konnte nicht gespeichert werden.");
  }
}

async function setRating(id: number, rating: number) {
  try {
    const { error } = await supabase
      .from("recipes")
      .update({
        rating,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === id
          ? {
              ...recipe,
              rating,
            }
          : recipe
      )
    );
  } catch (error) {
    console.error("Bewertung konnte nicht gespeichert werden:", error);
    alert("Bewertung konnte nicht gespeichert werden.");
  }
}

async function deleteRecipe(id: number) {
  const confirmed = window.confirm(t.deleteQuestion);

  if (!confirmed) {
    return;
  }

  try {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    setRecipes((currentRecipes) =>
      currentRecipes.filter((recipe) => recipe.id !== id)
    );
  } catch (error) {
    console.error("Rezept konnte nicht gelöscht werden:", error);
    alert("Das Rezept konnte nicht gelöscht werden.");
  }
}

  return (
    <>
      <main className="min-h-screen bg-stone-100 px-4 py-6 pb-32 sm:px-6 sm:py-8 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">
              Chaosküche
            </h1>

            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              Was wird heute gefuttert..?
            </p>
          </header>

          <section className="mb-7 space-y-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-stone-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />

            <button
              type="button"
              onClick={() => setShowFavoritesOnly((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
                showFavoritesOnly
                  ? "bg-red-600 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span aria-hidden="true">
                {showFavoritesOnly ? "♥" : "♡"}
              </span>

              {t.favoritesOnly}
            </button>

            {allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedTag("")}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                    selectedTag === ""
                      ? "bg-green-700 text-white"
                      : "bg-white text-stone-700"
                  }`}
                >
                  {t.all}
                </button>

                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                      selectedTag === tag
                        ? "bg-green-700 text-white"
                        : "bg-white text-stone-700"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </section>

          {filteredRecipes.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-stone-600">{t.noRecipes}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {filteredRecipes.map((recipe) => (
                <article
  key={recipe.id}
  onClick={() => router.push(`/rezepte/${recipe.id}`)}
  className="flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
>
                  
                  <div className="relative">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div
                        aria-label={t.imagePlaceholder}
                        className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-orange-100 via-stone-100 to-green-100"
                      >
                       <div className="text-center">
  <span className="text-xs text-stone-500">
    {t.imagePlaceholder}
  </span>
</div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
  event.stopPropagation();
  toggleFavorite(recipe.id);
}}
                      aria-label={t.favoriteLabel}
                      aria-pressed={recipe.favorite === true}
                      className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl shadow-md backdrop-blur transition hover:scale-105 active:scale-90 sm:right-3 sm:top-3 ${
                        recipe.favorite
                          ? "text-red-500"
                          : "text-stone-500"
                      }`}
                    >
                      {recipe.favorite ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-5">
                    <h2 className="line-clamp-2 text-base font-bold text-stone-900 sm:text-2xl">
                      {recipe.title}
                    </h2>

                    <div className="mt-2 flex items-center gap-0 sm:gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={(event) => {
  event.stopPropagation();
  setRating(recipe.id, star);
}}
                          className={`text-base transition hover:scale-110 sm:text-2xl ${
                            star <= (recipe.rating ?? 0)
                              ? "text-yellow-500"
                              : "text-stone-300"
                          }`}
                          aria-label={`${star} ${t.ratingLabel}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 sm:text-sm">
                      <span>
                        {recipe.cookingTime && recipe.cookingTime > 0
                          ? `${recipe.cookingTime} ${t.cookingTime}`
                          : t.noCookingTime}
                      </span>

                      <span aria-hidden="true" className="text-stone-300">
                        •
                      </span>

                      <span>
                        {recipe.ingredients.length} {t.ingredients}
                      </span>
                    </div>

                    {recipe.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {recipe.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="max-w-full truncate rounded-full bg-green-100 px-2 py-1 text-[11px] text-green-800 sm:px-2.5 sm:text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
                      <Link
                        href={`/rezepte/${recipe.id}`}
                        className="font-medium text-green-700 hover:underline"
                      >
                        {t.openRecipe}
                      </Link>

                      <button
                        type="button"
                        onClick={(event) => {
  event.stopPropagation();
  deleteRecipe(recipe.id);
}}
                        className="self-start rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700 transition hover:bg-red-100 sm:px-3 sm:text-sm"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
<Link
  href="/rezepte/neu"
  className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-700 text-4xl font-light text-white shadow-xl transition hover:scale-105 hover:bg-green-600 active:scale-95"
  aria-label={t.newRecipe}
>
  +
</Link>
      
    </>
  );
}