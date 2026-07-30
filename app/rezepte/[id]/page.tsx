"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function RecipePage() {
  const params = useParams();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);

  function addToShoppingList() {
  if (!recipe) {
    return;
  }

  const savedItems = localStorage.getItem("shopping-list");

  const shoppingItems = savedItems
    ? JSON.parse(savedItems)
    : [];

  const newItems = recipe.ingredients.map((ingredient, index) => ({
    id: `${recipe.id}-${Date.now()}-${index}`,
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    amount: ingredient.amount,
    unit: ingredient.unit,
    name: ingredient.name,
    checked: false,
  }));

  const updatedItems = [...shoppingItems, ...newItems];

  localStorage.setItem(
    "shopping-list",
    JSON.stringify(updatedItems)
  );

  alert("Die Zutaten wurden zur Einkaufsliste hinzugefügt.");
}

  useEffect(() => {
    const savedRecipes = localStorage.getItem("recipes");

    if (savedRecipes) {
      const recipes: Recipe[] = JSON.parse(savedRecipes);
      const recipeId = Number(params.id);

      const foundRecipe = recipes.find(
        (item) => item.id === recipeId
      );

      setRecipe(foundRecipe ?? null);
    }

    setLoaded(true);
  }, [params.id]);

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-100 p-8">
        Rezept wird geladen...
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-stone-100 p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold">
            Rezept nicht gefunden
          </h1>

          <Link
            href="/"
            className="mt-5 inline-block text-green-700 hover:underline"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 block text-green-700 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <article className="rounded-2xl bg-white p-8 shadow-sm">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <h1 className="text-4xl font-bold text-stone-900">
    {recipe.title}
  </h1>

  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={addToShoppingList}
      className="rounded-xl bg-green-700 px-4 py-2 font-medium text-white"
    >
      Zur Einkaufsliste
    </button>

    <Link
      href={`/rezepte/${recipe.id}/bearbeiten`}
      className="rounded-xl bg-stone-200 px-4 py-2 font-medium text-stone-800"
    >
      Bearbeiten
    </Link>
  </div>
</div>
          {recipe.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
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

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-stone-900">
              Zutaten
            </h2>

            <ul className="mt-4 space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="border-b border-stone-100 pb-2 text-stone-700"
                >
                  <span className="font-medium">
                    {ingredient.amount} {ingredient.unit}
                  </span>{" "}
                  {ingredient.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-stone-900">
              Zubereitung
            </h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">
              {recipe.instructions}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}