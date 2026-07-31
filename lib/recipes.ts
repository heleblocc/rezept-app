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
  recipe_ingredients: SupabaseIngredient[];
  recipe_tags: SupabaseTag[];
};

export async function getRecipes(): Promise<Recipe[]> {
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Rezepte konnten nicht geladen werden:", error);
    throw new Error(error.message);
  }

  const recipes = (data ?? []) as SupabaseRecipe[];

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    instructions: recipe.instructions ?? "",
    cookingTime: recipe.cooking_time ?? undefined,
    image: recipe.image ?? undefined,
    favorite: recipe.favorite ?? false,
    rating: recipe.rating ?? 0,

    ingredients: (recipe.recipe_ingredients ?? []).map((ingredient) => ({
      amount: ingredient.amount ?? "",
      unit: ingredient.unit ?? "",
      name: ingredient.name,
    })),

    tags: (recipe.recipe_tags ?? []).map((tagEntry) => tagEntry.tag),
  }));
}