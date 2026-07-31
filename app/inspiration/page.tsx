"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PantryItem = {
  id: string;
  amount: string;
  unit: string;
  name: string;
};

type InspirationIdea = {
  id: number;
  title: string;
  description: string;
  tags: string[];
  time: number;
  difficulty: "Einfach" | "Mittel";
  ingredients: string[];
};

type InspirationMatch = {
  idea: InspirationIdea;
  availableIngredients: string[];
  missingIngredients: string[];
};

const inspirationIdeas: InspirationIdea[] = [
  {
    id: 1,
    title: "Ofenkartoffeln mit Kräuterquark",
    description:
      "Knusprige Kartoffeln aus dem Ofen mit einem einfachen Kräuterquark.",
    tags: ["Vegetarisch", "Günstig", "Abendessen"],
    time: 45,
    difficulty: "Einfach",
    ingredients: [
      "Kartoffeln",
      "Quark",
      "Kräuter",
      "Salz",
      "Pfeffer",
    ],
  },
  {
    id: 2,
    title: "Schnelle Gemüsepfanne",
    description:
      "Gemüse nach Wahl mit Reis, Nudeln oder Brot kombinieren.",
    tags: ["Vegetarisch", "Schnell", "Resteverwertung"],
    time: 20,
    difficulty: "Einfach",
    ingredients: [
      "Paprika",
      "Zucchini",
      "Zwiebel",
      "Reis",
      "Öl",
    ],
  },
  {
    id: 3,
    title: "Shakshuka",
    description:
      "Eier in einer würzigen Tomatensoße mit Paprika und Zwiebeln.",
    tags: ["Vegetarisch", "International", "Abendessen"],
    time: 30,
    difficulty: "Mittel",
    ingredients: [
      "Eier",
      "Tomaten",
      "Paprika",
      "Zwiebel",
      "Knoblauch",
    ],
  },
  {
    id: 4,
    title: "Wraps mit Resten",
    description:
      "Wraps mit Gemüse, Käse, Salat oder anderen Resten füllen.",
    tags: ["Schnell", "Resteverwertung", "Mittagessen"],
    time: 15,
    difficulty: "Einfach",
    ingredients: [
      "Wraps",
      "Salat",
      "Tomaten",
      "Käse",
      "Joghurt",
    ],
  },
  {
    id: 5,
    title: "Nudelauflauf",
    description:
      "Nudeln mit Gemüse, Käse und einer einfachen Soße überbacken.",
    tags: ["Vegetarisch", "Günstig", "Abendessen"],
    time: 40,
    difficulty: "Einfach",
    ingredients: [
      "Nudeln",
      "Käse",
      "Sahne",
      "Tomaten",
      "Zwiebel",
    ],
  },
  {
    id: 6,
    title: "Curry mit Kokosmilch",
    description:
      "Gemüse und Kichererbsen in einer cremigen Currysoße.",
    tags: ["International", "Abendessen", "Meal Prep"],
    time: 35,
    difficulty: "Mittel",
    ingredients: [
      "Kokosmilch",
      "Kichererbsen",
      "Paprika",
      "Karotten",
      "Currypulver",
    ],
  },
  {
    id: 7,
    title: "Arme Ritter",
    description:
      "Eine einfache Möglichkeit, älteres Brot süß oder herzhaft zu verwenden.",
    tags: ["Frühstück", "Resteverwertung", "Günstig"],
    time: 15,
    difficulty: "Einfach",
    ingredients: [
      "Brot",
      "Eier",
      "Milch",
      "Zucker",
      "Butter",
    ],
  },
  {
    id: 8,
    title: "Couscous-Salat",
    description:
      "Couscous mit Gemüse, Kräutern und einem einfachen Dressing.",
    tags: ["Schnell", "Meal Prep", "Mittagessen"],
    time: 20,
    difficulty: "Einfach",
    ingredients: [
      "Couscous",
      "Tomaten",
      "Gurke",
      "Paprika",
      "Zitrone",
    ],
  },
  {
    id: 9,
    title: "Kartoffel-Ei-Pfanne",
    description:
      "Kartoffeln, Eier und Gemüse gemeinsam in einer Pfanne braten.",
    tags: ["Günstig", "Resteverwertung", "Abendessen"],
    time: 30,
    difficulty: "Einfach",
    ingredients: [
      "Kartoffeln",
      "Eier",
      "Zwiebel",
      "Paprika",
      "Öl",
    ],
  },
  {
    id: 10,
    title: "Bananen-Pancakes",
    description:
      "Schnelle Pancakes aus Banane, Ei und optional Haferflocken.",
    tags: ["Frühstück", "Süß", "Schnell"],
    time: 15,
    difficulty: "Einfach",
    ingredients: [
      "Banane",
      "Eier",
      "Haferflocken",
      "Milch",
    ],
  },
  {
    id: 11,
    title: "Blechgemüse mit Feta",
    description:
      "Verschiedenes Gemüse gemeinsam mit Feta im Ofen rösten.",
    tags: ["Vegetarisch", "Abendessen", "Meal Prep"],
    time: 40,
    difficulty: "Einfach",
    ingredients: [
      "Kartoffeln",
      "Paprika",
      "Zucchini",
      "Feta",
      "Öl",
    ],
  },
  {
    id: 12,
    title: "Tomaten-Mozzarella-Brot",
    description:
      "Geröstetes Brot mit Tomaten, Mozzarella und Kräutern.",
    tags: ["Schnell", "Mittagessen", "Vegetarisch"],
    time: 15,
    difficulty: "Einfach",
    ingredients: [
      "Brot",
      "Tomaten",
      "Mozzarella",
      "Kräuter",
      "Öl",
    ],
  },
];

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:()]/g, "")
    .replace(/\s+/g, " ");
}

function ingredientMatches(
  pantryName: string,
  ingredientName: string
) {
  const pantry = normalizeText(pantryName);
  const ingredient = normalizeText(ingredientName);

  if (pantry === ingredient) {
    return true;
  }

  if (pantry.length < 4 || ingredient.length < 4) {
    return false;
  }

  return (
    pantry.includes(ingredient) ||
    ingredient.includes(pantry)
  );
}
function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}
export default function InspirationPage() {
  const [selectedTag, setSelectedTag] = useState("Alle");
  const [search, setSearch] = useState("");
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [showPantryMatches, setShowPantryMatches] =
    useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useEffect(() => {
    const savedPantry = localStorage.getItem("pantry-items");

    if (savedPantry) {
      try {
        const parsedPantry: PantryItem[] =
          JSON.parse(savedPantry);

        setPantryItems(parsedPantry);
      } catch {
        setPantryItems([]);
      }
    }

    setLoaded(true);
  }, []);

  const availableTags = useMemo(() => {
    const tags = inspirationIdeas.flatMap(
      (idea) => idea.tags
    );

    return [
      "Alle",
      ...Array.from(new Set(tags)).sort((a, b) =>
        a.localeCompare(b, "de")
      ),
    ];
  }, []);

  const inspirationMatches = useMemo<
    InspirationMatch[]
  >(() => {
    return inspirationIdeas
      .map((idea) => {
        const availableIngredients =
          idea.ingredients.filter((ingredient) =>
            pantryItems.some((pantryItem) =>
              ingredientMatches(
                pantryItem.name,
                ingredient
              )
            )
          );

        const missingIngredients =
          idea.ingredients.filter(
            (ingredient) =>
              !availableIngredients.includes(ingredient)
          );

        return {
          idea,
          availableIngredients,
          missingIngredients,
        };
      })
      .sort((a, b) => {
        if (
          a.missingIngredients.length !==
          b.missingIngredients.length
        ) {
          return (
            a.missingIngredients.length -
            b.missingIngredients.length
          );
        }

        return a.idea.title.localeCompare(
          b.idea.title,
          "de"
        );
      });
  }, [pantryItems]);

const filteredMatches = useMemo(() => {
  const normalizedSearch = normalizeText(search);

  const matches = inspirationMatches.filter((match) => {
    const matchesTag =
      selectedTag === "Alle" ||
      match.idea.tags.includes(selectedTag);

    const matchesSearch =
      normalizeText(match.idea.title).includes(
        normalizedSearch
      ) ||
      normalizeText(match.idea.description).includes(
        normalizedSearch
      );

    const matchesPantry =
      !showPantryMatches ||
      match.availableIngredients.length > 0;

    return (
      matchesTag &&
      matchesSearch &&
      matchesPantry
    );
  });

  return shuffleArray(matches);
}, [
  inspirationMatches,
  selectedTag,
  search,
  showPantryMatches,
  shuffleSeed,
]);

  const ideaOfTheDay = useMemo(() => {
    const today = new Date();

    const dayNumber = Math.floor(
      Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ) /
        (1000 * 60 * 60 * 24)
    );

    return inspirationIdeas[
      dayNumber % inspirationIdeas.length
    ];
  }, []);

  function addMissingToShoppingList(
    match: InspirationMatch
  ) {
    const savedShoppingList =
      localStorage.getItem("shopping-list");

    let shoppingItems = [];

    try {
      shoppingItems = savedShoppingList
        ? JSON.parse(savedShoppingList)
        : [];
    } catch {
      shoppingItems = [];
    }

    const newItems = match.missingIngredients.map(
      (ingredient, index) => ({
        id: `inspiration-${match.idea.id}-${Date.now()}-${index}`,
        recipeId: 0,
        recipeTitle: match.idea.title,
        amount: "",
        unit: "",
        name: ingredient,
        checked: false,
      })
    );

    localStorage.setItem(
      "shopping-list",
      JSON.stringify([
        ...shoppingItems,
        ...newItems,
      ])
    );

    alert(
      "Die fehlenden Zutaten wurden zur Einkaufsliste hinzugefügt."
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-100 p-8">
        Inspirationen werden geladen...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 block text-green-700 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <header>
          <h1 className="text-4xl font-bold text-stone-900">
            Inspiration
          </h1>

          <p className="mt-2 text-stone-600">
            Ideen passend zu deinem Vorrat und zu dem,
            worauf du gerade Lust hast.
          </p>
        </header>

        <section className="mt-8 rounded-2xl bg-green-100 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-800">
            Idee des Tages
          </p>

          <h2 className="mt-2 text-2xl font-bold text-stone-900">
            {ideaOfTheDay.title}
          </h2>

          <p className="mt-2 text-stone-700">
            {ideaOfTheDay.description}
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Inspiration aus meinem Vorrat
              </h2>

              <p className="mt-1 text-sm text-stone-600">
                {pantryItems.length > 0
                  ? `${pantryItems.length} Lebensmittel im Vorrat`
                  : "Dein Vorrat ist noch leer."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPantryMatches(
                  !showPantryMatches
                )
              }
              disabled={pantryItems.length === 0}
              className={`rounded-xl px-5 py-3 font-medium ${
                showPantryMatches
                  ? "bg-green-700 text-white"
                  : "bg-stone-200 text-stone-800"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {showPantryMatches
                ? "Alle Ideen anzeigen"
                : "Passende Ideen anzeigen"}
            </button>
          </div>

          {pantryItems.length === 0 && (
            <Link
              href="/vorrat"
              className="mt-4 inline-block font-medium text-green-700 hover:underline"
            >
              Vorrat eintragen →
            </Link>
          )}
        </section>

        <section className="mt-8">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Ideen durchsuchen..."
            className="w-full rounded-xl border border-stone-300 bg-white p-4 text-stone-900"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedTag === tag
                    ? "bg-green-700 text-white"
                    : "bg-white text-stone-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
         <div className="flex flex-wrap items-center justify-between gap-4">
  <h2 className="text-2xl font-bold text-stone-900">
    Rezeptideen
  </h2>

  <div className="flex items-center gap-3">
    <span className="text-sm text-stone-500">
      {filteredMatches.length} Ideen
    </span>

    <button
      type="button"
      onClick={() =>
        setShuffleSeed((current) => current + 1)
      }
      className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-300"
    >
      Neue Vorschläge
    </button>
  </div>
</div>

          {filteredMatches.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-stone-600">
                Keine passende Idee gefunden.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {filteredMatches.map((match) => (
                <article
                  key={match.idea.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <h3 className="text-xl font-bold text-stone-900">
                    {match.idea.title}
                  </h3>

                  <p className="mt-2 text-stone-600">
                    {match.idea.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-500">
                    <span>
                      {match.idea.time} Minuten
                    </span>

                    <span>
                      {match.idea.difficulty}
                    </span>

                    <span>
                      {match.availableIngredients.length} von{" "}
                      {match.idea.ingredients.length} Zutaten vorhanden
                    </span>
                  </div>

                  {pantryItems.length > 0 && (
                    <div className="mt-4">
                      {match.missingIngredients.length ===
                      0 ? (
                        <p className="font-medium text-green-700">
                          Alle Zutaten vorhanden
                        </p>
                      ) : (
                        <>
                          <p className="font-medium text-stone-800">
                            Es fehlt:
                          </p>

                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
                            {match.missingIngredients.map(
                              (ingredient) => (
                                <li key={ingredient}>
                                  {ingredient}
                                </li>
                              )
                            )}
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {match.idea.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedTag(tag)
                        }
                        className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/rezepte/neu?title=${encodeURIComponent(
                        match.idea.title
                      )}`}
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white"
                    >
                      Als eigenes Rezept anlegen
                    </Link>

                    {match.missingIngredients.length >
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          addMissingToShoppingList(
                            match
                          )
                        }
                        className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-800"
                      >
                        Fehlendes einkaufen
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}