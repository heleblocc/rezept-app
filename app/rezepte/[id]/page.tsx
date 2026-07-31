"use client";

import { supabase } from "@/lib/supabase";
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
  favorite?: boolean;
  rating?: number;
  cookingTime?: number;
  image?: string;
};

type ShoppingItem = {
  id: string;
  recipeId: number;
  recipeTitle: string;
  amount: string;
  unit: string;
  name: string;
  checked: boolean;
};

export default function RecipePage() {
  const params = useParams();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);

useEffect(() => {
  async function loadRecipe() {
    const recipeId = Number(params.id);

    if (!Number.isFinite(recipeId)) {
      setRecipe(null);
      setLoaded(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          id,
          title,
          instructions,
          cooking_time,
          image,
          favorite,
          rating,
          recipe_ingredients (
            amount,
            unit,
            name
          ),
          recipe_tags (
            tag
          )
        `)
        .eq("id", recipeId)
        .single();

      if (error) {
        throw error;
      }

      setRecipe({
        id: data.id,
        title: data.title,
        instructions: data.instructions ?? "",
        cookingTime: data.cooking_time ?? undefined,
        image: data.image ?? undefined,
        favorite: data.favorite ?? false,
        rating: data.rating ?? 0,

        ingredients: (data.recipe_ingredients ?? []).map(
          (ingredient) => ({
            amount: ingredient.amount ?? "",
            unit: ingredient.unit ?? "",
            name: ingredient.name,
          })
        ),

        tags: (data.recipe_tags ?? []).map(
          (tagEntry) => tagEntry.tag
        ),
      });
    } catch (error) {
      console.error("Rezept konnte nicht geladen werden:", error);
      setRecipe(null);
    }

    setLoaded(true);
  }

  loadRecipe();
}, [params.id]);

async function updateRecipe(updatedRecipe: Recipe) {
  try {
    const { error } = await supabase
      .from("recipes")
      .update({
        favorite: updatedRecipe.favorite ?? false,
        rating: updatedRecipe.rating ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedRecipe.id);

    if (error) {
      throw error;
    }

    setRecipe(updatedRecipe);
  } catch (error) {
    console.error("Änderung konnte nicht gespeichert werden:", error);
    alert("Die Änderung konnte nicht gespeichert werden.");
  }
}

  function toggleFavorite() {
    if (!recipe) {
      return;
    }

    updateRecipe({
      ...recipe,
      favorite: !recipe.favorite,
    });
  }

  function setRating(rating: number) {
    if (!recipe) {
      return;
    }

    updateRecipe({
      ...recipe,
      rating,
    });
  }

 async function addToShoppingList() {
  if (!recipe) {
    return;
  }

  try {
    const newItems = recipe.ingredients.map((ingredient) => ({
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      amount: ingredient.amount,
      unit: ingredient.unit,
      name: ingredient.name,
      checked: false,
    }));

    const { error } = await supabase
      .from("shopping_list")
      .insert(newItems);

    if (error) {
      throw error;
    }

    alert("Die Zutaten wurden zur Einkaufsliste hinzugefügt.");
  } catch (error) {
    console.error(
      "Zutaten konnten nicht zur Einkaufsliste hinzugefügt werden:",
      error
    );

    alert(
      "Die Zutaten konnten nicht zur Einkaufsliste hinzugefügt werden."
    );
  }
}

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-100 px-5 py-8">
        <div className="mx-auto max-w-3xl text-stone-600">
          Rezept wird geladen...
        </div>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-stone-100 px-5 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-stone-900">
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
    <main className="min-h-screen bg-stone-100 px-4 py-6 pb-24 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-green-700 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative">
            {recipe.image ? (
              <img
                src={recipe.image}
                alt={recipe.title}
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-orange-100 via-stone-100 to-green-100">
                <span className="text-sm font-medium text-stone-500">
                  Kein Rezeptbild vorhanden
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleFavorite}
              aria-label="Favorit ändern"
              aria-pressed={recipe.favorite === true}
              className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-3xl shadow-md transition hover:scale-105 active:scale-90 ${
                recipe.favorite ? "text-red-500" : "text-stone-500"
              }`}
            >
              {recipe.favorite ? "♥" : "♡"}
            </button>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-3xl font-bold text-stone-900 sm:text-4xl">
                  {recipe.title}
                </h1>

                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition hover:scale-110 sm:text-3xl ${
                        star <= (recipe.rating ?? 0)
                          ? "text-yellow-500"
                          : "text-stone-300"
                      }`}
                      aria-label={`${star} Sterne vergeben`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-600">
                  <span className="rounded-full bg-stone-100 px-3 py-1.5">
                    {recipe.cookingTime && recipe.cookingTime > 0
                      ? `${recipe.cookingTime} Minuten`
                      : "Keine Kochzeit angegeben"}
                  </span>

                  <span className="rounded-full bg-stone-100 px-3 py-1.5">
                    {recipe.ingredients.length} Zutaten
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addToShoppingList}
                  className="rounded-xl bg-green-700 px-4 py-2.5 font-medium text-white transition hover:bg-green-600"
                >
                  Zur Einkaufsliste
                </button>

                <Link
                  href={`/rezepte/${recipe.id}/bearbeiten`}
                  className="rounded-xl bg-stone-200 px-4 py-2.5 font-medium text-stone-800 transition hover:bg-stone-300"
                >
                  Bearbeiten
                </Link>
              </div>
            </div>

            {recipe.tags.map((tag, index) => (
  <span
    key={`${tag}-${index}`}
    className="rounded-full ..."
  >
    {tag}
  </span>
))}

            <section className="mt-9">
              <h2 className="text-xl font-semibold text-stone-900">
                Zutaten
              </h2>

              <ul className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-100">
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={index}
                    className="flex gap-2 px-4 py-3 text-stone-700"
                  >
                    <span className="min-w-fit font-medium text-stone-900">
                      {[ingredient.amount, ingredient.unit]
                        .filter(Boolean)
                        .join(" ")}
                    </span>

                    <span>{ingredient.name}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-9">
              <h2 className="text-xl font-semibold text-stone-900">
                Zubereitung
              </h2>

              {recipe.instructions.trim() ? (
                <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">
                  {recipe.instructions}
                </p>
              ) : (
                <p className="mt-4 text-stone-500">
                  Für dieses Rezept wurde noch keine Zubereitung eingetragen.
                </p>
              )}
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}