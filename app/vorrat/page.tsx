"use client";


import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getRecipes } from "@/lib/recipes";

type PantryItem = {
  id: string;
  amount: string;
  unit: string;
  name: string;
};

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
};

type MissingIngredient = {
  name: string;
  amount: string;
  unit: string;
};

type RecipeMatch = {
  recipe: Recipe;
  missingIngredients: MissingIngredient[];
  availableCount: number;
  totalCount: number;
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:()]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeUnit(value: string) {
  const normalized = normalizeText(value);

  const unitMap: Record<string, string> = {
    gramm: "g",
    kilogramm: "kg",
    kilogramme: "kg",
    milliliter: "ml",
    liter: "l",
    stück: "stück",
    stk: "stück",
    packung: "packung",
    packungen: "packung",
    dose: "dose",
    dosen: "dose",
    esslöffel: "el",
    teelöffel: "tl",
  };

  return unitMap[normalized] ?? normalized;
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function ingredientNamesMatch(first: string, second: string) {
  const firstName = normalizeText(first);
  const secondName = normalizeText(second);

  if (firstName === secondName) {
    return true;
  }

  if (firstName.length < 4 || secondName.length < 4) {
    return false;
  }

  return (
    firstName.includes(secondName) ||
    secondName.includes(firstName)
  );
}

export default function VorratPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
  async function loadData() {
    const savedItems = localStorage.getItem("pantry-items");

    if (savedItems) {
      try {
        const parsedItems: PantryItem[] =
          JSON.parse(savedItems);

        setItems(parsedItems);
      } catch {
        setItems([]);
      }
    }

    try {
      const loadedRecipes = await getRecipes();

      const validRecipes = loadedRecipes.filter(
        (recipe) =>
          recipe &&
          Array.isArray(recipe.ingredients)
      );

      setRecipes(validRecipes);
    } catch (error) {
      console.error(
        "Rezepte konnten nicht geladen werden:",
        error
      );

      setRecipes([]);
    }

    setLoaded(true);
  }

  loadData();
}, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return items
      .filter((item) =>
        normalizeText(item.name).includes(normalizedSearch)
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      );
  }, [items, search]);

  const recipeMatches = useMemo<RecipeMatch[]>(() => {
    return recipes
      .map((recipe) => {
        const missingIngredients: MissingIngredient[] = [];

        for (const ingredient of recipe.ingredients) {
          const matchingPantryItems = items.filter(
            (pantryItem) =>
              ingredientNamesMatch(
                pantryItem.name,
                ingredient.name
              )
          );

          if (matchingPantryItems.length === 0) {
            missingIngredients.push({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
            });

            continue;
          }

          const requiredAmount =
            parseAmount(ingredient.amount);

          if (requiredAmount === null) {
            continue;
          }

          const requiredUnit =
            normalizeUnit(ingredient.unit);

          const matchingAmount =
            matchingPantryItems.reduce(
              (total, pantryItem) => {
                const pantryUnit =
                  normalizeUnit(pantryItem.unit);

                const pantryAmount =
                  parseAmount(pantryItem.amount);

                if (
                  pantryAmount === null ||
                  pantryUnit !== requiredUnit
                ) {
                  return total;
                }

                return total + pantryAmount;
              },
              0
            );

          if (matchingAmount < requiredAmount) {
            const missingAmount =
              requiredAmount - matchingAmount;

            missingIngredients.push({
              name: ingredient.name,
              amount: String(missingAmount),
              unit: ingredient.unit,
            });
          }
        }

        return {
          recipe,
          missingIngredients,
          availableCount:
            recipe.ingredients.length -
            missingIngredients.length,
          totalCount: recipe.ingredients.length,
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

        return a.recipe.title.localeCompare(
          b.recipe.title,
          "de"
        );
      });
  }, [items, recipes]);

  const cookableRecipes = recipeMatches.filter(
    (match) => match.missingIngredients.length === 0
  );

  const almostCookableRecipes = recipeMatches.filter(
    (match) => match.missingIngredients.length === 1
  );

  const otherRecipes = recipeMatches.filter(
    (match) => match.missingIngredients.length > 1
  );

  function saveItems(updatedItems: PantryItem[]) {
    setItems(updatedItems);

    localStorage.setItem(
      "pantry-items",
      JSON.stringify(updatedItems)
    );
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedName = name.trim();

    if (!cleanedName) {
      alert("Bitte gib ein Lebensmittel ein.");
      return;
    }

    const newItem: PantryItem = {
      id: `pantry-${Date.now()}`,
      amount: amount.trim(),
      unit: unit.trim(),
      name: cleanedName,
    };

    saveItems([...items, newItem]);

    setAmount("");
    setUnit("");
    setName("");
  }

  function deleteItem(id: string) {
    const updatedItems = items.filter(
      (item) => item.id !== id
    );

    saveItems(updatedItems);
  }

  function clearPantry() {
    const confirmed = window.confirm(
      "Möchtest du deinen gesamten Vorrat löschen?"
    );

    if (!confirmed) {
      return;
    }

    saveItems([]);
  }

  function addMissingToShoppingList(
    match: RecipeMatch
  ) {
    const savedItems =
      localStorage.getItem("shopping-list");

    const shoppingItems = savedItems
      ? JSON.parse(savedItems)
      : [];

    const newItems = match.missingIngredients.map(
      (ingredient, index) => ({
        id: `missing-${match.recipe.id}-${Date.now()}-${index}`,
        recipeId: match.recipe.id,
        recipeTitle: match.recipe.title,
        amount: ingredient.amount,
        unit: ingredient.unit,
        name: ingredient.name,
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
        Vorrat wird geladen...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 block text-green-700 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-stone-900">
              Wir haben Brot zu Hause
            </h1>

            <p className="mt-2 text-stone-600">
              Dein Vorrat wird mit deinen Rezepten verglichen.
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearPantry}
              className="self-start rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700"
            >
              Vorrat löschen
            </button>
          )}
        </div>

        <form
          onSubmit={addItem}
          className="mt-8 rounded-2xl bg-white p-5 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-stone-900">
            Lebensmittel hinzufügen
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-[100px_130px_1fr_auto]">
            <input
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Menge"
              className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />

            <input
              value={unit}
              onChange={(event) =>
                setUnit(event.target.value)
              }
              placeholder="Einheit"
              className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Zum Beispiel Brot"
              className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />

            <button
              type="submit"
              className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white"
            >
              Hinzufügen
            </button>
          </div>
        </form>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-stone-900">
              Mein Vorrat
            </h2>

            <span className="text-sm text-stone-500">
              {items.length} Lebensmittel
            </span>
          </div>

          {items.length > 0 && (
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Vorrat durchsuchen..."
              className="mt-4 w-full rounded-xl border border-stone-300 bg-white p-4 text-stone-900"
            />
          )}

          <div className="mt-4">
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-stone-600">
                  {items.length === 0
                    ? "Dein Vorrat ist noch leer."
                    : "Kein passendes Lebensmittel gefunden."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm"
                  >
                    <p className="text-stone-900">
                      {(item.amount || item.unit) && (
                        <span className="font-semibold">
                          {item.amount} {item.unit}{" "}
                        </span>
                      )}

                      {item.name}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        deleteItem(item.id)
                      }
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                    >
                      Löschen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-bold text-stone-900">
            Was kann ich kochen?
          </h2>

          {recipes.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-stone-600">
                Du hast noch keine Rezepte gespeichert.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              <RecipeSection
                title="Sofort kochbar"
                matches={cookableRecipes}
                emptyText="Aktuell ist noch kein Rezept vollständig kochbar."
                addMissingToShoppingList={
                  addMissingToShoppingList
                }
              />

              <RecipeSection
                title="Es fehlt nur eine Zutat"
                matches={almostCookableRecipes}
                emptyText="Bei keinem Rezept fehlt genau eine Zutat."
                addMissingToShoppingList={
                  addMissingToShoppingList
                }
              />

              <RecipeSection
                title="Dafür musst du noch mehr einkaufen"
                matches={otherRecipes}
                emptyText="Keine weiteren Rezepte vorhanden."
                addMissingToShoppingList={
                  addMissingToShoppingList
                }
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type RecipeSectionProps = {
  title: string;
  matches: RecipeMatch[];
  emptyText: string;
  addMissingToShoppingList: (
    match: RecipeMatch
  ) => void;
};

function RecipeSection({
  title,
  matches,
  emptyText,
  addMissingToShoppingList,
}: RecipeSectionProps) {
  return (
    <section>
      <h3 className="text-2xl font-semibold text-stone-900">
        {title}
      </h3>

      {matches.length === 0 ? (
        <p className="mt-3 text-stone-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {matches.map((match) => (
            <article
              key={match.recipe.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <h4 className="text-xl font-bold text-stone-900">
                {match.recipe.title}
              </h4>

              <p className="mt-2 text-sm text-stone-500">
                {match.availableCount} von{" "}
                {match.totalCount} Zutaten vorhanden
              </p>

              {match.missingIngredients.length === 0 ? (
                <p className="mt-4 font-medium text-green-700">
                  Alle Zutaten vorhanden
                </p>
              ) : (
                <div className="mt-4">
                  <p className="font-medium text-stone-800">
                    Es fehlt:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
                    {match.missingIngredients.map(
                      (ingredient, index) => (
                        <li key={index}>
                          {ingredient.amount}{" "}
                          {ingredient.unit}{" "}
                          {ingredient.name}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/rezepte/${match.recipe.id}`}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white"
                >
                  Rezept öffnen
                </Link>

                {match.missingIngredients.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      addMissingToShoppingList(match)
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
  );
}