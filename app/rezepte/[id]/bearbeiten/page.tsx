"use client";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function RezeptBearbeiten() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

   const [title, setTitle] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [recipeFound, setRecipeFound] = useState(false);
const [image, setImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState("");
const [oldImageUrl, setOldImageUrl] = useState("");

 useEffect(() => {
  async function loadRecipe() {
    const recipeId = Number(params.id);

    if (!Number.isFinite(recipeId)) {
      setLoaded(true);
      return;
    }

    try {
      const { data: recipe, error } = await supabase
        .from("recipes")
        .select(`
          id,
          title,
          instructions,
          cooking_time,
          image,
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

      if (error) throw error;

     const { data: managedTags, error: managedTagsError } =
  await supabase
    .from("tags")
    .select("name")
    .order("name");

if (managedTagsError) {
  console.error(
    "Tags aus der Tags-Tabelle konnten nicht geladen werden:",
    managedTagsError
  );
}

const { data: usedTags, error: usedTagsError } =
  await supabase
    .from("recipe_tags")
    .select("tag")
    .order("tag");

if (usedTagsError) {
  console.error(
    "Verwendete Rezept-Tags konnten nicht geladen werden:",
    usedTagsError
  );
}

const currentRecipeTags = [
  ...new Set(
    (recipe.recipe_tags ?? [])
      .map((item) => item.tag)
      .filter(Boolean)
  ),
];

const allAvailableTags = [
  ...new Set([
    ...(managedTags ?? [])
      .map((item) => item.name)
      .filter(Boolean),

    ...(usedTags ?? [])
      .map((item) => item.tag)
      .filter(Boolean),

    ...currentRecipeTags,
  ]),
].sort((a, b) => a.localeCompare(b, "de"));

setAvailableTags(allAvailableTags);
setSelectedTags(currentRecipeTags);

setTitle(recipe.title);
setCookingTime(
  recipe.cooking_time ? String(recipe.cooking_time) : ""
);

setInstructions(recipe.instructions ?? "");
setImagePreview(recipe.image ?? "");
setOldImageUrl(recipe.image ?? "");
      setIngredients(
        recipe.recipe_ingredients.length > 0
          ? recipe.recipe_ingredients
          : [{ amount: "", unit: "", name: "" }]
      );

      setRecipeFound(true);
    } catch (error) {
      console.error(error);
      setRecipeFound(false);
    }

    setLoaded(true);
  }

  loadRecipe();
}, [params.id]);

  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    const updatedIngredients = [...ingredients];

    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };

    setIngredients(updatedIngredients);
  }

  function addIngredient() {
    setIngredients([
      ...ingredients,
      {
        amount: "",
        unit: "",
        name: "",
      },
    ]);
  }
  function toggleTag(tag: string) {
  if (selectedTags.includes(tag)) {
    setSelectedTags(
      selectedTags.filter((selectedTag) => selectedTag !== tag)
    );
  } else {
    setSelectedTags([...selectedTags, tag]);
  }
}
function handleImageChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Bitte wähle ein Bild aus.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Das Bild darf maximal 5 MB groß sein.");
    return;
  }

  setImage(file);
  setImagePreview(URL.createObjectURL(file));
}
  function removeIngredient(index: number) {
    if (ingredients.length === 1) {
      return;
    }

    setIngredients(
      ingredients.filter(
        (_, ingredientIndex) => ingredientIndex !== index
      )
    );
  }

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!title.trim()) {
    alert("Bitte gib einen Rezeptnamen ein.");
    return;
  }

  const cleanedIngredients = ingredients
  .filter((ingredient) => (ingredient.name ?? "").trim() !== "")
  .map((ingredient) => ({
    amount: (ingredient.amount ?? "").trim(),
    unit: (ingredient.unit ?? "").trim(),
    name: (ingredient.name ?? "").trim(),
  }));

  const parsedCookingTime =
    cookingTime.trim() === "" ? null : Number(cookingTime);

  if (
    parsedCookingTime !== null &&
    (!Number.isFinite(parsedCookingTime) || parsedCookingTime <= 0)
  ) {
    alert("Bitte gib eine gültige Kochzeit ein.");
    return;
  }

  if (cleanedIngredients.length === 0) {
    alert("Bitte gib mindestens eine Zutat ein.");
    return;
  }

  const recipeId = Number(params.id);

  if (!Number.isFinite(recipeId)) {
    alert("Ungültige Rezept-ID.");
    return;
  }

  try {
    let imageUrl = oldImageUrl;

    if (image) {
      const fileExtension =
        image.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `recipes/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filePath, image, {
          cacheControl: "3600",
          upsert: false,
          contentType: image.type,
        });

      if (uploadError) {
        alert(`Bild konnte nicht hochgeladen werden: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const { error: recipeError } = await supabase
      .from("recipes")
      .update({
        title: title.trim(),
        instructions: instructions.trim(),
        cooking_time: parsedCookingTime,
        image: imageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (recipeError) {
      throw recipeError;
    }

    const { error: deleteIngredientsError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (deleteIngredientsError) {
      throw deleteIngredientsError;
    }

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(
        cleanedIngredients.map((ingredient) => ({
          recipe_id: recipeId,
          amount: ingredient.amount,
          unit: ingredient.unit,
          name: ingredient.name,
        }))
      );

    if (ingredientsError) {
      throw ingredientsError;
    }

    const { error: deleteTagsError } = await supabase
      .from("recipe_tags")
      .delete()
      .eq("recipe_id", recipeId);

    if (deleteTagsError) {
      throw deleteTagsError;
    }
const uniqueSelectedTags = [...new Set(selectedTags)];
    if (uniqueSelectedTags.length > 0) {
      const { error: tagsError } = await supabase
        .from("recipe_tags")
        .insert(
          uniqueSelectedTags.map((tag) => ({
            recipe_id: recipeId,
            tag,
          }))
        );

      if (tagsError) {
        throw tagsError;
      }
    }

    router.push(`/rezepte/${recipeId}`);
    router.refresh();
  } catch (error) {
    console.error("Rezept konnte nicht gespeichert werden:", error);
    alert("Das Rezept konnte nicht gespeichert werden.");
  }
}

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-100 p-8">
        Rezept wird geladen...
      </main>
    );
  }

  if (!recipeFound) {
    return (
      <main className="min-h-screen bg-stone-100 px-5 py-8">
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
          href={`/rezepte/${params.id}`}
          className="mb-6 block text-green-700 hover:underline"
        >
          ← Zurück zum Rezept
        </Link>

        <h1 className="mb-8 text-4xl font-bold text-stone-900">
          Rezept bearbeiten
        </h1>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block font-semibold text-stone-800"
            >
              Rezeptname
            </label>

            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />
          </div>
          <div>
  <label
    htmlFor="cookingTime"
    className="mb-2 block font-semibold text-stone-800"
  >
    Kochzeit
  </label>

  <div className="relative">
    <input
      id="cookingTime"
      type="number"
      min="1"
      value={cookingTime}
      onChange={(event) => setCookingTime(event.target.value)}
      placeholder="30"
      className="w-full rounded-xl border border-stone-300 bg-white p-3 pr-24 text-stone-900"
    />

    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-500">
      Minuten
    </span>
  </div>
</div>
<div>
  <label
    htmlFor="recipeImage"
    className="mb-2 block font-semibold text-stone-800"
  >
    Rezeptbild
  </label>

  <input
    id="recipeImage"
    type="file"
    accept="image/*"
    onChange={handleImageChange}
    className="mb-4"
  />

  {imagePreview && (
    <img
      src={imagePreview}
      alt="Rezeptbild"
      className="h-64 w-full rounded-xl object-cover"
    />
  )}
</div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">
                Zutaten
              </h2>

              <button
                type="button"
                onClick={addIngredient}
                className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800"
              >
                + Zutat
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[80px_100px_1fr_auto] gap-2"
                >
                  <input
                    value={ingredient.amount ?? ""}
                    onChange={(event) =>
                      updateIngredient(
                        index,
                        "amount",
                        event.target.value
                      )
                    }
                    placeholder="Menge"
                    className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900"
                  />

                  <input
                    value={ingredient.unit ?? ""}
                    onChange={(event) =>
                      updateIngredient(
                        index,
                        "unit",
                        event.target.value
                      )
                    }
                    placeholder="Einheit"
                    className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900"
                  />

                  <input
                    value={ingredient.name ?? ""}
                    onChange={(event) =>
                      updateIngredient(
                        index,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Zutat"
                    className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900"
                  />

                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="rounded-lg bg-red-100 px-3 text-red-700"
                    aria-label="Zutat entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="instructions"
              className="mb-2 block font-semibold text-stone-800"
            >
              Zubereitung
            </label>

            <textarea
              id="instructions"
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={9}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />
          </div>

         <div>
  <div className="mb-3 flex items-center justify-between gap-4">
    <h2 className="font-semibold text-stone-800">
      Tags
    </h2>

    <Link
      href="/tags"
      className="text-sm font-medium text-green-700 hover:underline"
    >
      Tags verwalten
    </Link>
  </div>

  {availableTags.length === 0 ? (
    <div className="rounded-xl bg-white p-4 text-stone-600">
      Noch keine Tags vorhanden.
      <Link
        href="/tags"
        className="ml-1 font-medium text-green-700 hover:underline"
      >
        Jetzt Tags erstellen
      </Link>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const isSelected = selectedTags.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              isSelected
                ? "bg-green-700 text-white"
                : "bg-white text-stone-700"
            }`}
          >
            {isSelected ? "✓ " : ""}
            {tag}
          </button>
        );
      })}
    </div>
  )}
</div>

          <button
            type="submit"
            className="w-full rounded-xl bg-green-700 px-6 py-4 font-semibold text-white"
          >
            Änderungen speichern
          </button>
        </form>
      </div>
    </main>
  );
}