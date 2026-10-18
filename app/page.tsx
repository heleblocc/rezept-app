
"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { getRecipes, type Recipe } from "@/lib/recipes";
import { supabase } from "@/lib/supabase";

type ArchiveView = "mine" | "public";
type Language = "de" | "en";

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
    favoriteLabel: "Favorit ändern",
    ratingLabel: "Sterne vergeben",
    imagePlaceholder: "Kein Rezeptbild vorhanden",
    mine: "Meine Rezepte",
    public: "Großes Archiv",
    privateLabel: "Privat",
    publicLabel: "Öffentlich",
    categories: "Kategorien",
    publicEmpty: "Noch keine öffentlichen Rezepte vorhanden.",
    loginRequired: "Melde dich an, um deine Rezepte zu sehen.",
    loading: "Rezepte werden geladen...",
    loadError: "Rezepte konnten nicht geladen werden.",
    recipes: "Rezepte",
    visibilityError: "Die Sichtbarkeit konnte nicht gespeichert werden.",
    favoriteError: "Favorit konnte nicht gespeichert werden.",
    ratingError: "Bewertung konnte nicht gespeichert werden.",
    otherFavorite:
      "Favoriten für fremde Rezepte ergänzen wir im nächsten Schritt.",
    otherRating:
      "Persönliche Bewertungen fremder Rezepte ergänzen wir später.",
    changeVisibility: "Sichtbarkeit ändern",
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
    favoriteLabel: "Change favorite",
    ratingLabel: "Rate recipe",
    imagePlaceholder: "No recipe image available",
    mine: "My Recipes",
    public: "Public Archive",
    privateLabel: "Private",
    publicLabel: "Public",
    categories: "Categories",
    publicEmpty: "No public recipes yet.",
    loginRequired: "Sign in to see your recipes.",
    loading: "Loading recipes...",
    loadError: "Recipes could not be loaded.",
    recipes: "recipes",
    visibilityError: "Visibility could not be saved.",
    favoriteError: "Favorite could not be saved.",
    ratingError: "Rating could not be saved.",
    otherFavorite:
      "Favorites for other users' recipes will be added later.",
    otherRating:
      "Personal ratings for other users' recipes will be added later.",
    changeVisibility: "Change visibility",
  },
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState(
    searchParams.get("tag") ?? ""
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [language, setLanguage] = useState<Language>("de");
  const [archiveView, setArchiveView] =
    useState<ArchiveView>("mine");

  const [savingVisibilityId, setSavingVisibilityId] =
    useState<number | null>(null);

  const t = texts[language];

  // Rezepte und angemeldeten Benutzer laden
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        let currentUserId: string | null = null;

        // Eine fehlende Sitzung ist kein Ladefehler.
        // Öffentliche Rezepte sollen trotzdem geladen werden.
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            if (authError.name !== "AuthSessionMissingError") {
              console.warn(
                "Supabase-Anmeldung:",
                authError.message
              );
            }
          } else {
            currentUserId = user?.id ?? null;
          }
        } catch (authError) {
          console.warn(
            "Benutzer konnte nicht ermittelt werden:",
            authError
          );
        }

        const loadedRecipes = await getRecipes();

        if (!active) return;

        setUserId(currentUserId);
        setRecipes(loadedRecipes);
      } catch (error) {
        console.error(
          "Startseite konnte nicht geladen werden:",
          error
        );

        if (active) {
          setLoadError(
            "Rezepte konnten nicht geladen werden."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    // Bei Anmeldung oder Abmeldung neu laden.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT"
        ) {
          void loadData();
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Spracheinstellungen
  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("app-language");

    if (
      savedLanguage === "de" ||
      savedLanguage === "en"
    ) {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(event: Event) {
      const customEvent =
        event as CustomEvent<Language>;

      if (
        customEvent.detail === "de" ||
        customEvent.detail === "en"
      ) {
        setLanguage(customEvent.detail);
      }
    }

    window.addEventListener(
      "language-change",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "language-change",
        handleLanguageChange
      );
    };
  }, []);

  // Kategorie aus der URL übernehmen
  useEffect(() => {
    setSelectedTag(
      searchParams.get("tag") ?? ""
    );
  }, [searchParams]);

  // Eigene Rezepte
  const myRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          userId !== null &&
          recipe.userId === userId
      ),
    [recipes, userId]
  );

  // Öffentliche Rezepte
  const publicRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.visibility === "public"
      ),
    [recipes]
  );

  const visibleRecipes =
    archiveView === "mine"
      ? myRecipes
      : publicRecipes;

  // Verfügbare Kategorien
  const allTags = useMemo(() => {
    return Array.from(
      new Set(
        visibleRecipes.flatMap(
          (recipe) => recipe.tags ?? []
        )
      )
    ).sort((a, b) =>
      a.localeCompare(b, "de")
    );
  }, [visibleRecipes]);

  // Suche und Filter
  const filteredRecipes = useMemo(() => {
    const normalizedSearch =
      search.toLowerCase().trim();

    return visibleRecipes.filter((recipe) => {
      const matchesSearch =
        recipe.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name
            .toLowerCase()
            .includes(normalizedSearch)
        );

      const matchesTag =
        selectedTag === "" ||
        recipe.tags.includes(selectedTag);

      const matchesFavorite =
        !showFavoritesOnly ||
        recipe.favorite === true;

      return (
        matchesSearch &&
        matchesTag &&
        matchesFavorite
      );
    });
  }, [
    visibleRecipes,
    search,
    selectedTag,
    showFavoritesOnly,
  ]);

  // Zwischen den Archiven wechseln
  function switchArchive(view: ArchiveView) {
    setArchiveView(view);
    setSelectedTag("");
    setSearch("");
    setShowFavoritesOnly(false);

    router.replace("/", {
      scroll: false,
    });
  }

  // Kategorie auswählen
  function selectTag(tag: string) {
    setSelectedTag(tag);

    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (tag) {
      params.set("tag", tag);
    } else {
      params.delete("tag");
    }

    const query = params.toString();

    router.replace(
      query ? `/?${query}` : "/",
      { scroll: false }
    );
  }

  // Sichtbarkeit ändern
  async function toggleVisibility(id: number) {
    const recipe = recipes.find(
      (item) => item.id === id
    );

    if (
      !recipe ||
      !userId ||
      recipe.userId !== userId ||
      savingVisibilityId !== null
    ) {
      return;
    }

    const newVisibility =
      recipe.visibility === "private"
        ? "public"
        : "private";

    setSavingVisibilityId(id);

    try {
      const { data, error } = await supabase
        .from("recipes")
        .update({
          visibility: newVisibility,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("visibility")
        .single();

      if (error) throw error;

      setRecipes((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                visibility:
                  data.visibility === "public"
                    ? "public"
                    : "private",
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Sichtbarkeit konnte nicht geändert werden:",
        error
      );

      alert(t.visibilityError);
    } finally {
      setSavingVisibilityId(null);
    }
  }

  // Favorit ändern
  async function toggleFavorite(id: number) {
    const recipe = recipes.find(
      (item) => item.id === id
    );

    if (!recipe) return;

    if (
      !userId ||
      recipe.userId !== userId
    ) {
      alert(t.otherFavorite);
      return;
    }

    const newFavorite = !recipe.favorite;

    const { error } = await supabase
      .from("recipes")
      .update({
        favorite: newFavorite,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Favorit konnte nicht gespeichert werden:",
        error
      );

      alert(t.favoriteError);
      return;
    }

    setRecipes((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              favorite: newFavorite,
            }
          : item
      )
    );
  }

  // Bewertung ändern
  async function setRating(
    id: number,
    rating: number
  ) {
    const recipe = recipes.find(
      (item) => item.id === id
    );

    if (!recipe) return;

    if (
      !userId ||
      recipe.userId !== userId
    ) {
      alert(t.otherRating);
      return;
    }

    const { error } = await supabase
      .from("recipes")
      .update({ rating })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Bewertung konnte nicht gespeichert werden:",
        error
      );

      alert(t.ratingError);
      return;
    }

    setRecipes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, rating }
          : item
      )
    );
  }

  // Rezept öffnen
  function openRecipe(id: number) {
    router.push(
      selectedTag
        ? `/rezepte/${id}?tag=${encodeURIComponent(
            selectedTag
          )}`
        : `/rezepte/${id}`
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#F7F3EC] px-4 py-6 pb-32 sm:px-6 sm:py-8 md:pb-16">
        <div className="mx-auto max-w-5xl">

          {/* Titel */}
          <header className="mb-7 text-center">
            <h1 className="text-3xl font-bold text-[#292B29]">
              Schmausarchiv
            </h1>

            <p className="mt-1 text-sm text-[#858780]">
              Mahlzeit, Majestät!
            </p>
          </header>

          {/* Archiv-Auswahl */}
          <div className="mb-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                switchArchive("mine")
              }
              className={`rounded-2xl border p-4 text-left transition ${
                archiveView === "mine"
                  ? "border-[#526655] bg-[#E5EAE3] shadow-sm"
                  : "border-[#E8E5DF] bg-white/80 hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-[#292B29] sm:text-base">
                {t.mine}
              </div>

              <div className="mt-1 text-xs text-[#858780]">
                {myRecipes.length} {t.recipes}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                switchArchive("public")
              }
              className={`rounded-2xl border p-4 text-left transition ${
                archiveView === "public"
                  ? "border-[#526655] bg-[#E5EAE3] shadow-sm"
                  : "border-[#E8E5DF] bg-white/80 hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-[#292B29] sm:text-base">
                {t.public}
              </div>

              <div className="mt-1 text-xs text-[#858780]">
                {publicRecipes.length} {t.recipes}
              </div>
            </button>
          </div>

          {/* Suche und Filter */}
          <section className="mb-7 space-y-4">
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={
                  t.searchPlaceholder
                }
                aria-label={
                  t.searchPlaceholder
                }
                className="w-full rounded-2xl border border-white/70 bg-white/80 py-4 pl-12 pr-4 text-stone-900 shadow-sm outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFavoritesOnly(
                  (current) => !current
                )
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
                showFavoritesOnly
                  ? "bg-red-600 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span aria-hidden="true">
                {showFavoritesOnly
                  ? "♥"
                  : "♡"}
              </span>

              {t.favoritesOnly}
            </button>

            {/* Kategorien */}
            {allTags.length > 0 && (
              <section className="mb-8 mt-6">
                <h2 className="mb-3 text-base font-semibold text-[#292B25]">
                  {t.categories}
                </h2>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectTag("")
                    }
                    className={`rounded-full px-4 py-2 text-xs font-medium ${
                      selectedTag === ""
                        ? "bg-[#344D3B] text-white"
                        : "border border-[#E7E0D6] bg-[#FFFDF9] text-[#344D3B]"
                    }`}
                  >
                    {t.all}
                  </button>

                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        selectTag(tag)
                      }
                      className={`rounded-full px-4 py-2 text-xs font-medium ${
                        selectedTag === tag
                          ? "bg-[#344D3B] text-white"
                          : "border border-[#E7E0D6] bg-[#FFFDF9] text-[#344D3B]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>

          {/* Rezeptliste */}
          {loading ? (
            <div className="rounded-2xl bg-white/80 p-6 text-stone-600">
              {t.loading}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl bg-white/80 p-6 text-red-700">
              {loadError}
            </div>
          ) : archiveView === "mine" &&
            !userId ? (
            <div className="rounded-2xl bg-white/80 p-6 text-stone-600">
              {t.loginRequired}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm">
              <p className="text-stone-600">
                {archiveView === "public" &&
                publicRecipes.length === 0
                  ? t.publicEmpty
                  : t.noRecipes}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {filteredRecipes.map(
                (recipe) => {
                  const isOwner =
                    userId !== null &&
                    recipe.userId === userId;

                  return (
                    <article
                      key={recipe.id}
                      onClick={(event) => {
                        const target =
                          event.target as HTMLElement;

                        if (
                          target.closest("button")
                        ) {
                          return;
                        }

                        openRecipe(
                          recipe.id
                        );
                      }}
                      className="flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-md transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                    >
                      {/* Rezeptbild */}
                      <div className="relative">
                        {recipe.image ? (
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-orange-100 via-stone-100 to-green-100 p-3 text-center">
                            <span className="text-sm text-stone-500">
                              {
                                t.imagePlaceholder
                              }
                            </span>
                          </div>
                        )}

                        {/* Sichtbarkeit */}
                        {isOwner ? (
                          <button
                            type="button"
                            disabled={
                              savingVisibilityId !==
                              null
                            }
                            onClick={(
                              event
                            ) => {
                              event.preventDefault();
                              event.stopPropagation();

                              void toggleVisibility(
                                recipe.id
                              );
                            }}
                            title={
                              t.changeVisibility
                            }
                            aria-label={`${
                              t.changeVisibility
                            }: ${
                              recipe.visibility ===
                              "public"
                                ? t.publicLabel
                                : t.privateLabel
                            }`}
                            className="absolute bottom-2 left-2 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-medium text-[#3D5041] disabled:opacity-60"
                          >
                            {recipe.visibility ===
                            "public"
                              ? t.publicLabel
                              : t.privateLabel}
                          </button>
                        ) : (
                          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-medium text-[#3D5041]">
                            {
                              t.publicLabel
                            }
                          </span>
                        )}

                        {/* Favoriten */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.preventDefault();
                              event.stopPropagation();

                              void toggleFavorite(
                                recipe.id
                              );
                            }}
                            aria-label={
                              t.favoriteLabel
                            }
                            aria-pressed={
                              recipe.favorite
                            }
                            className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl shadow-md transition hover:scale-105 ${
                              recipe.favorite
                                ? "text-red-500"
                                : "text-stone-500"
                            }`}
                          >
                            {recipe.favorite
                              ? "♥"
                              : "♡"}
                          </button>
                        )}
                      </div>

                      {/* Rezeptinformationen */}
                      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900 sm:text-base">
                          {recipe.title}
                        </h2>

                        {/* Bewertung */}
                        <div className="mt-2 flex items-center gap-0.5">
                          {[
                            1, 2, 3, 4, 5,
                          ].map((star) =>
                            isOwner ? (
                              <button
                                key={star}
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.preventDefault();
                                  event.stopPropagation();

                                  void setRating(
                                    recipe.id,
                                    star
                                  );
                                }}
                                className={`text-xs transition hover:scale-110 sm:text-sm ${
                                  star <=
                                  recipe.rating
                                    ? "text-yellow-500"
                                    : "text-stone-300"
                                }`}
                                aria-label={`${star} ${t.ratingLabel}`}
                              >
                                ★
                              </button>
                            ) : (
                              <span
                                key={star}
                                className={`text-xs sm:text-sm ${
                                  star <=
                                  recipe.rating
                                    ? "text-yellow-500"
                                    : "text-stone-300"
                                }`}
                              >
                                ★
                              </span>
                            )
                          )}
                        </div>

                        {/* Kochzeit und Zutaten */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 sm:text-xs">
                          <span>
                            {recipe.cookingTime &&
                            recipe.cookingTime >
                              0
                              ? `${recipe.cookingTime} ${t.cookingTime}`
                              : t.noCookingTime}
                          </span>

                          <span
                            aria-hidden="true"
                            className="text-stone-300"
                          >
                            •
                          </span>

                          <span>
                            {
                              recipe.ingredients
                                .length
                            }{" "}
                            {t.ingredients}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </main>

      {/* Neues Rezept */}
      
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F7F3EC] p-8">
          Rezepte werden geladen...
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
