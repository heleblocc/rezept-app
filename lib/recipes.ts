
import { supabase } from "@/lib/supabase";

export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
};

export type Recipe = {
  id: number;
  title: string;
  ingredients: Ingredient[];
  instructions: string;
  tags: string[];
  favorite: boolean;
  rating: number;
  cookingTime?: number;
  image?: string;

  // Besitzer und Sichtbarkeit
  userId: string;
  visibility: "private" | "public";
};

type SupabaseIngredient = {
  amount: string | null;
  unit: string | null;
  name: string;
};

type SupabaseTag = {
  tag: string;
};

type SupabaseRecipe = {
  id: number;
  title: string;
  instructions: string | null;
  cooking_time: number | null;
  image: string | null;
  favorite: boolean | null;
  rating: number | null;

  // Neue Datenbankfelder
  user_id: string;
  visibility: "private" | "public" | null;

  recipe_ingredients: SupabaseIngredient[] | null;
  recipe_tags: SupabaseTag[] | null;
};

export async function getRecipes(): Promise<Recipe[]> {
  console.log("Lade Rezepte aus Supabase...");

  const { data, error, status } = await supabase
    .from("recipes")
    .select(`
      id,
      title,
      instructions,
      cooking_time,
      image,
      favorite,
      rating,
      user_id,
      visibility,
      recipe_ingredients (
        amount,
        unit,
        name
      ),
      recipe_tags (
        tag
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase-Ladefehler:", {
      message: error.message,
      code: error.code,
      details: error.details,
      status,
    });

    throw new Error(
      `Rezepte konnten nicht geladen werden: ${error.message}`
    );
  }

  const recipes = (data ?? []) as SupabaseRecipe[];

  console.log("Anzahl geladener Rezepte:", recipes.length);

  console.log(
    "Zutaten-Diagnose:",
    recipes.slice(0, 5).map((recipe) => ({
      rezeptId: recipe.id,
      titel: recipe.title,
      anzahlZutaten:
        recipe.recipe_ingredients?.length ?? 0,
      zutaten: recipe.recipe_ingredients,
    }))
  );

  if (recipes.length === 0) {
    console.warn(
      "Supabase hat keine sichtbaren Rezepte zurückgegeben. " +
      "Bitte Datenbankzugriff und RLS-Regeln prüfen."
    );
  }

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    instructions: recipe.instructions ?? "",
    cookingTime: recipe.cooking_time ?? undefined,
    image: recipe.image ?? undefined,
    favorite: recipe.favorite ?? false,
    rating: recipe.rating ?? 0,

    // Besitzer und Sichtbarkeit
    userId: recipe.user_id,
    visibility: recipe.visibility ?? "private",

    ingredients: (recipe.recipe_ingredients ?? []).map(
      (ingredient) => ({
        amount: ingredient.amount ?? "",
        unit: ingredient.unit ?? "",
        name: ingredient.name,
      })
    ),

    tags: [
      ...new Set(
        (recipe.recipe_tags ?? [])
          .map((entry) => entry.tag)
          .filter(Boolean)
      ),
    ],
  }));
}
