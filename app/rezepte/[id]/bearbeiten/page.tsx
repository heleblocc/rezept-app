
"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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

const emptyIngredient = (): Ingredient => ({
  amount: "",
  unit: "",
  name: "",
});

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 text-[#292B29] outline-none transition focus:border-[#526655] focus:ring-2 focus:ring-[#E5EAE3]";

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
  const [isSaving, setIsSaving] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [oldImageUrl, setOldImageUrl] = useState("");

  // VORHANDENES REZEPT LADEN
  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      setLoaded(false);
      setRecipeFound(false);

      const recipeId = Number(params.id);

      if (!Number.isFinite(recipeId) || recipeId <= 0) {
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

        if (error || !recipe) {
          throw error ?? new Error("Rezept nicht gefunden.");
        }

        const { data: managedTags, error: managedTagsError } =
          await supabase
            .from("tags")
            .select("name")
            .order("name");

        if (managedTagsError) {
          console.error(
            "Tags konnten nicht geladen werden:",
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
            "Verwendete Tags konnten nicht geladen werden:",
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

        if (cancelled) return;

        setAvailableTags(allAvailableTags);
        setSelectedTags(currentRecipeTags);

        setTitle(recipe.title ?? "");
        setCookingTime(
          recipe.cooking_time
            ? String(recipe.cooking_time)
            : ""
        );
        setInstructions(recipe.instructions ?? "");

        setImage(null);
        setImagePreview(recipe.image ?? "");
        setOldImageUrl(recipe.image ?? "");

        const loadedIngredients: Ingredient[] =
          (recipe.recipe_ingredients ?? []).map((ingredient) => ({
            amount: String(ingredient.amount ?? ""),
            unit: ingredient.unit ?? "",
            name: ingredient.name ?? "",
          }));

        setIngredients(
          loadedIngredients.length > 0
            ? loadedIngredients
            : [emptyIngredient()]
        );

        setRecipeFound(true);
      } catch (error) {
        console.error("Fehler beim Laden des Rezepts:", error);

        if (!cancelled) {
          setRecipeFound(false);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // ZUTATEN BEARBEITEN
  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? { ...ingredient, [field]: value }
          : ingredient
      )
    );
  }

  // NEUE ZUTAT ANS ENDE ANHÄNGEN
  function addIngredient() {
    setIngredients((current) => [
      ...current,
      emptyIngredient(),
    ]);
  }

  // ZUTAT ENTFERNEN
  function removeIngredient(index: number) {
    setIngredients((current) =>
      current.length <= 1
        ? current
        : current.filter(
            (_, ingredientIndex) => ingredientIndex !== index
          )
    );
  }

  // TAG AUSWÄHLEN
  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selectedTag) => selectedTag !== tag)
        : [...current, tag]
    );
  }

  // NEUES REZEPTBILD AUSWÄHLEN
  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
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

  // ÄNDERUNGEN SPEICHERN
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSaving) return;

    if (!title.trim()) {
      alert("Bitte gib einen Rezeptnamen ein.");
      return;
    }

    const cleanedIngredients = ingredients
      .filter(
        (ingredient) => (ingredient.name ?? "").trim() !== ""
      )
      .map((ingredient) => ({
        amount: (ingredient.amount ?? "").trim(),
        unit: (ingredient.unit ?? "").trim(),
        name: (ingredient.name ?? "").trim(),
      }));

    if (cleanedIngredients.length === 0) {
      alert("Bitte gib mindestens eine Zutat ein.");
      return;
    }

    const parsedCookingTime =
      cookingTime.trim() === ""
        ? null
        : Number(cookingTime);

    if (
      parsedCookingTime !== null &&
      (!Number.isFinite(parsedCookingTime) ||
        parsedCookingTime <= 0)
    ) {
      alert("Bitte gib eine gültige Kochzeit ein.");
      return;
    }

    const recipeId = Number(params.id);

    if (!Number.isFinite(recipeId) || recipeId <= 0) {
      alert("Ungültige Rezept-ID.");
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = oldImageUrl;

      // NEUES BILD HOCHLADEN
      if (image) {
        const fileExtension =
          image.name.split(".").pop()?.toLowerCase() || "jpg";

        const safeFileName =
          `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

        const filePath = `recipes/${safeFileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("recipe-images")
            .upload(filePath, image, {
              cacheControl: "3600",
              upsert: false,
              contentType: image.type,
            });

        if (uploadError) {
          throw new Error(
            `Bild konnte nicht hochgeladen werden: ${uploadError.message}`
          );
        }

        const { data } = supabase.storage
          .from("recipe-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      // REZEPT AKTUALISIEREN
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

      // ALTE ZUTATEN ENTFERNEN
      const { error: deleteIngredientsError } =
        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", recipeId);

      if (deleteIngredientsError) {
        throw deleteIngredientsError;
      }

      // AKTUELLE ZUTATEN SPEICHERN
      const { error: ingredientsError } =
        await supabase
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

      // ALTE TAG-VERKNÜPFUNGEN ENTFERNEN
      const { error: deleteTagsError } =
        await supabase
          .from("recipe_tags")
          .delete()
          .eq("recipe_id", recipeId);

      if (deleteTagsError) {
        throw deleteTagsError;
      }

      // AKTUELLE TAGS SPEICHERN
      const uniqueSelectedTags = [...new Set(selectedTags)];

      if (uniqueSelectedTags.length > 0) {
        const { error: tagsError } =
          await supabase
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

      // ZUR REZEPTANSICHT ZURÜCK
      router.push(`/rezepte/${recipeId}`);
      router.refresh();
    } catch (error) {
      console.error(
        "Rezept konnte nicht gespeichert werden:",
        error
      );

      alert(
        error instanceof Error
          ? `Das Rezept konnte nicht gespeichert werden: ${error.message}`
          : "Das Rezept konnte nicht gespeichert werden."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // LADEANSICHT
  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#F6F4F0] p-8 text-[#526655]">
        Rezept wird geladen...
      </main>
    );
  }

  // REZEPT NICHT GEFUNDEN
  if (!recipeFound) {
    return (
      <main className="min-h-screen bg-[#F6F4F0] px-5 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold text-[#292B29]">
            Rezept nicht gefunden
          </h1>

          <Link
            href="/"
            className="mt-5 inline-block text-[#526655] hover:underline"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F4F0] px-4 py-6 pb-28 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">

        {/* KOPFBEREICH */}
        <Link
          href={`/rezepte/${params.id}`}
          className="mb-5 inline-block text-sm font-medium text-[#526655] hover:underline"
        >
          ← Zurück zum Rezept
        </Link>

        <h1 className="mb-8 text-3xl font-semibold text-[#292B29] sm:text-4xl">
          Rezept bearbeiten
        </h1>

        <form onSubmit={handleSubmit} className="space-y-7">

          {/* REZEPTNAME */}
          <section>
            <label
              htmlFor="title"
              className="mb-2 block font-semibold text-[#292B29]"
            >
              Rezeptname
            </label>

            <input
              id="title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Rezeptname"
              className={inputClass}
            />
          </section>

          {/* KOCHZEIT */}
          <section>
            <label
              htmlFor="cookingTime"
              className="mb-2 block font-semibold text-[#292B29]"
            >
              Kochzeit
            </label>

            <div className="relative">
              <input
                id="cookingTime"
                type="number"
                min="1"
                inputMode="numeric"
                value={cookingTime}
                onChange={(event) =>
                  setCookingTime(event.target.value)
                }
                placeholder="30"
                className={`${inputClass} pr-24`}
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#858780]">
                Minuten
              </span>
            </div>
          </section>

          {/* REZEPTBILD */}
          <section>
            <h2 className="mb-2 font-semibold text-[#292B29]">
              Rezeptbild
            </h2>

            <label
              htmlFor="recipeImage"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B4C0B2] bg-white p-6 text-center transition hover:bg-[#E5EAE3]"
            >
              <span className="font-medium text-[#292B29]">
                Neues Bild auswählen
              </span>

              <span className="mt-1 text-sm text-[#858780]">
                JPG, PNG oder WebP, maximal 5 MB
              </span>
            </label>

            <input
              id="recipeImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview && (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E8E5DF] bg-white">
                <img
                  src={imagePreview}
                  alt="Rezeptbild"
                  className="h-64 w-full object-cover"
                />
              </div>
            )}
          </section>

          {/* ZUTATEN */}
          <section>
            <h2 className="mb-3 font-semibold text-[#292B29]">
              Zutaten
            </h2>

            {/* 1. ALLE VORHANDENEN ZUTATEN */}
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#E8E5DF] bg-white p-3 shadow-sm"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[90px_110px_1fr_auto]">

                    {/* MENGE */}
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
                      aria-label={`Menge für Zutat ${index + 1}`}
                      className={inputClass}
                    />

                    {/* EINHEIT */}
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
                      aria-label={`Einheit für Zutat ${index + 1}`}
                      className={inputClass}
                    />

                    {/* ZUTATENNAME */}
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
                      aria-label={`Name der Zutat ${index + 1}`}
                      className={`${inputClass} col-span-2 sm:col-span-1`}
                    />

                    {/* ZUTAT ENTFERNEN */}
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                      aria-label={`Zutat ${index + 1} entfernen`}
                      className="col-span-2 rounded-xl bg-[#F4EEEB] px-3 py-2 text-sm font-medium text-[#956B62] transition hover:bg-[#EDE2DD] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. HINZUFÜGEN-BUTTON UNTER DER LISTE */}
            <button
              type="button"
              onClick={addIngredient}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B4C0B2] bg-[#E5EAE3] px-4 py-3 text-sm font-medium text-[#526655] transition hover:bg-[#DCE5DA]"
            >
              <span className="text-xl leading-none">+</span>
              Zutat hinzufügen
            </button>
          </section>

          {/* 3. ZUBEREITUNG DIREKT DANACH */}
          <section>
            <label
              htmlFor="instructions"
              className="mb-2 block font-semibold text-[#292B29]"
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
              placeholder="Beschreibe die einzelnen Schritte..."
              className={`${inputClass} resize-y`}
            />
          </section>

          {/* TAGS */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-[#292B29]">
                Tags
              </h2>

              <Link
                href="/tags"
                className="text-sm font-medium text-[#526655] hover:underline"
              >
                Tags verwalten
              </Link>
            </div>

            {availableTags.length === 0 ? (
              <div className="rounded-xl border border-[#E8E5DF] bg-white p-4 text-[#858780]">
                Noch keine Tags vorhanden.
                <Link
                  href="/tags"
                  className="ml-1 font-medium text-[#526655] hover:underline"
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
                      aria-pressed={isSelected}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-[#526655] bg-[#526655] text-white"
                          : "border-[#E8E5DF] bg-white text-[#526655] hover:bg-[#E5EAE3]"
                      }`}
                    >
                      {isSelected ? "✓ " : ""}
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ÄNDERUNGEN SPEICHERN */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[#526655] px-6 py-4 font-semibold text-white transition hover:bg-[#3D5041] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Wird gespeichert..."
              : "Änderungen speichern"}
          </button>
        </form>
      </div>
    </main>
  );
}
