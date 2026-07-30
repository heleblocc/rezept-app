"use client";
import { supabase } from "@/lib/supabase";
import Navigation from "./components/Navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

const texts = {
  de: {
    title: "Meine Rezepte",
    subtitle: "Meine persönliche Rezeptsammlung",
    pantry: "Wir haben Brot zu Hause",
    inspiration: "Inspiration",
    shoppingList: "Einkaufsliste",
    newRecipe: "+ Neues Rezept",
    searchPlaceholder: "Nach Rezepten oder Zutaten suchen...",
    favoritesOnly: "★ Nur Favoriten",
    all: "Alle",
    noRecipes: "Keine passenden Rezepte gefunden.",
    ingredients: "Zutaten",
    openRecipe: "Rezept öffnen →",
    delete: "Löschen",
    deleteQuestion: "Möchtest du dieses Rezept wirklich löschen?",
    rating: "von 5",
    favoriteLabel: "Favorit ändern",
    ratingLabel: "Sterne vergeben",
  },
  en: {
    title: "My Recipes",
    subtitle: "My personal recipe collection",
    pantry: "We Have Food at Home",
    inspiration: "Inspiration",
    shoppingList: "Shopping List",
    newRecipe: "+ New Recipe",
    searchPlaceholder: "Search recipes or ingredients...",
    favoritesOnly: "★ Favorites only",
    all: "All",
    noRecipes: "No matching recipes found.",
    ingredients: "ingredients",
    openRecipe: "Open recipe →",
    delete: "Delete",
    deleteQuestion: "Do you really want to delete this recipe?",
    rating: "out of 5",
    favoriteLabel: "Change favorite",
    ratingLabel: "stars",
  },
};

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [language, setLanguage] = useState<"de" | "en">("de");

  const t = texts[language];

useEffect(() => {
  async function loadRecipes() {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Rezepte konnten nicht geladen werden:", error);
      setRecipes([]);
      return;
    }

    setRecipes((data ?? []) as Recipe[]);
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
      setLanguage(customEvent.detail);
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

  function toggleFavorite(id: number) {
    const updatedRecipes = recipes.map((recipe) =>
      recipe.id === id
        ? {
            ...recipe,
            favorite: !recipe.favorite,
          }
        : recipe
    );

    setRecipes(updatedRecipes);
    localStorage.setItem("recipes", JSON.stringify(updatedRecipes));
  }

  function setRating(id: number, rating: number) {
    const updatedRecipes = recipes.map((recipe) =>
      recipe.id === id
        ? {
            ...recipe,
            rating,
          }
        : recipe
    );

    setRecipes(updatedRecipes);
    localStorage.setItem("recipes", JSON.stringify(updatedRecipes));
  }

  function deleteRecipe(id: number) {
    const confirmed = window.confirm(t.deleteQuestion);

    if (!confirmed) {
      return;
    }

    const updatedRecipes = recipes.filter((recipe) => recipe.id !== id);

    setRecipes(updatedRecipes);
    localStorage.setItem("recipes", JSON.stringify(updatedRecipes));
  }

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-stone-100 px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 flex items-center justify-between gap-5">
            <div>
              <h1 className="text-4xl font-bold text-stone-900">
                {t.title}
              </h1>

              <p className="mt-2 text-stone-600">{t.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/vorrat"
                className="rounded-xl bg-stone-200 px-5 py-3 font-medium text-stone-800"
              >
                {t.pantry}
              </Link>

              <Link
                href="/inspiration"
                className="rounded-xl bg-stone-200 px-5 py-3 font-medium text-stone-800"
              >
                {t.inspiration}
              </Link>

              <Link
                href="/einkaufsliste"
                className="rounded-xl bg-stone-200 px-5 py-3 font-medium text-stone-800"
              >
                {t.shoppingList}
              </Link>

              <Link
                href="/rezepte/neu"
                className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white"
              >
                {t.newRecipe}
              </Link>
            </div>
          </header>

          <section className="mb-8 space-y-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-stone-300 bg-white p-4 text-stone-900"
            />

            <button
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                showFavoritesOnly
                  ? "bg-yellow-500 text-white"
                  : "bg-white text-stone-700"
              }`}
            >
              {t.favoritesOnly}
            </button>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTag("")}
                  className={`rounded-full px-4 py-2 text-sm ${
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
                    className={`rounded-full px-4 py-2 text-sm ${
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
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRecipes.map((recipe) => (
                <article
                  key={recipe.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-bold text-stone-900">
                      {recipe.title}
                    </h2>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(recipe.id)}
                      className={`text-3xl ${
                        recipe.favorite
                          ? "text-yellow-500"
                          : "text-stone-300"
                      }`}
                      aria-label={t.favoriteLabel}
                    >
                      ★
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(recipe.id, star)}
                        className={`text-2xl ${
                          star <= (recipe.rating ?? 0)
                            ? "text-yellow-500"
                            : "text-stone-300"
                        }`}
                        aria-label={`${star} ${t.ratingLabel}`}
                      >
                        ★
                      </button>
                    ))}

                    {(recipe.rating ?? 0) > 0 && (
                      <span className="ml-2 text-sm text-stone-500">
                        {recipe.rating} {t.rating}
                      </span>
                    )}
                  </div>

                  {recipe.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 text-sm text-stone-500">
                    {recipe.ingredients.length} {t.ingredients}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <Link
                      href={`/rezepte/${recipe.id}`}
                      className="font-medium text-green-700 hover:underline"
                    >
                      {t.openRecipe}
                    </Link>

                    <button
                      type="button"
                      onClick={() => deleteRecipe(recipe.id)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                    >
                      {t.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}