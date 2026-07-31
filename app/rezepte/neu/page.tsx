"use client";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";

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

export default function NeuesRezept() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [image, setImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState("");
const [importText, setImportText] = useState("");
const [showImport, setShowImport] = useState(false);
const [isReadingImage, setIsReadingImage] = useState(false);
const [ocrProgress, setOcrProgress] = useState(0);

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    {
      amount: "",
      unit: "",
      name: "",
    },
  ]);

  useEffect(() => {
    const savedTags = localStorage.getItem("recipe-tags");

    if (!savedTags) {
      return;
    }

    try {
      const parsedTags: unknown = JSON.parse(savedTags);

      if (Array.isArray(parsedTags)) {
        setAvailableTags(
          parsedTags.filter((tag): tag is string => typeof tag === "string")
        );
      }
    } catch {
      setAvailableTags([]);
    }
  }, []);

  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    setIngredients((currentIngredients) =>
      currentIngredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? {
              ...ingredient,
              [field]: value,
            }
          : ingredient
      )
    );
  }

  function addIngredient() {
    setIngredients((currentIngredients) => [
      ...currentIngredients,
      {
        amount: "",
        unit: "",
        name: "",
      },
    ]);
  }

  function removeIngredient(index: number) {
    if (ingredients.length === 1) {
      return;
    }

    setIngredients((currentIngredients) =>
      currentIngredients.filter(
        (_, ingredientIndex) => ingredientIndex !== index
      )
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((selectedTag) => selectedTag !== tag)
        : [...currentTags, tag]
    );
  }
  async function handleImportImage(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Bitte wähle einen Screenshot oder ein Bild aus.");
    return;
  }

  setIsReadingImage(true);
  setOcrProgress(0);

  try {
    const worker = await createWorker("deu", 1, {
      logger: (message) => {
        if (
          message.status === "recognizing text" &&
          typeof message.progress === "number"
        ) {
          setOcrProgress(Math.round(message.progress * 100));
        }
      },
    });

    const result = await worker.recognize(file);

    await worker.terminate();

    const recognizedText = result.data.text.trim();

    if (!recognizedText) {
      alert("Auf dem Bild konnte kein Text erkannt werden.");
      return;
    }

    setImportText(recognizedText);
  } catch (error) {
    console.error("Fehler bei der Texterkennung:", error);
    alert("Der Text konnte aus dem Bild nicht erkannt werden.");
  } finally {
    setIsReadingImage(false);
    event.target.value = "";
  }
}
function importRecipeText() {
  const cleanedText = importText.trim();

  if (!cleanedText) {
    alert("Bitte füge zuerst einen Rezepttext ein.");
    return;
  }

  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const ingredientsHeadingIndex = lines.findIndex((line) =>
    /^(zutaten|ingredients)\s*:?\s*$/i.test(line)
  );

  const instructionsHeadingIndex = lines.findIndex((line) =>
    /^(zubereitung|anleitung|zubereitungsweise|instructions)\s*:?\s*$/i.test(
      line
    )
  );

  const firstHeadingIndex = [
    ingredientsHeadingIndex,
    instructionsHeadingIndex,
  ]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  const importedTitle =
    firstHeadingIndex !== undefined
      ? lines.slice(0, firstHeadingIndex).join(" ")
      : lines[0];

  if (importedTitle) {
    setTitle(importedTitle);
  }

  let ingredientLines: string[] = [];

  if (ingredientsHeadingIndex >= 0) {
    const ingredientEnd =
      instructionsHeadingIndex > ingredientsHeadingIndex
        ? instructionsHeadingIndex
        : lines.length;

    ingredientLines = lines.slice(
      ingredientsHeadingIndex + 1,
      ingredientEnd
    );
  }

  const parsedIngredients: Ingredient[] = ingredientLines
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(\d+(?:[.,]\d+)?(?:\/\d+)?|½|¼|¾)?\s*([a-zA-ZäöüÄÖÜß]+)?\s*(.*)$/
      );

      if (!match) {
        return {
          amount: "",
          unit: "",
          name: line,
        };
      }

      const amount = match[1] ?? "";
      const possibleUnit = match[2] ?? "";
      const remainingName = match[3]?.trim() ?? "";

      const knownUnits = [
        "g",
        "kg",
        "ml",
        "l",
        "el",
        "tl",
        "prise",
        "prisen",
        "dose",
        "dosen",
        "packung",
        "packungen",
        "stück",
        "stk",
        "bund",
        "tasse",
        "tassen",
      ];

      const isKnownUnit = knownUnits.includes(
        possibleUnit.toLowerCase()
      );

      return {
        amount,
        unit: isKnownUnit ? possibleUnit : "",
        name: isKnownUnit
          ? remainingName
          : [possibleUnit, remainingName].filter(Boolean).join(" "),
      };
    })
    .filter((ingredient) => ingredient.name.trim());

  if (parsedIngredients.length > 0) {
    setIngredients(parsedIngredients);
  }

  if (instructionsHeadingIndex >= 0) {
    const importedInstructions = lines
      .slice(instructionsHeadingIndex + 1)
      .join("\n");

    setInstructions(importedInstructions);
  } else if (ingredientsHeadingIndex < 0) {
    setInstructions(lines.slice(1).join("\n"));
  }

  setShowImport(false);
}

function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
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
 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!title.trim()) {
    alert("Bitte gib einen Rezeptnamen ein.");
    return;
  }

  const cleanedIngredients = ingredients
    .filter((ingredient) => ingredient.name.trim() !== "")
    .map((ingredient) => ({
      amount: ingredient.amount.trim(),
      unit: ingredient.unit.trim(),
      name: ingredient.name.trim(),
    }));

  if (cleanedIngredients.length === 0) {
    alert("Bitte gib mindestens eine Zutat ein.");
    return;
  }

  const parsedCookingTime =
    cookingTime.trim() === "" ? undefined : Number(cookingTime);

  if (
    parsedCookingTime !== undefined &&
    (!Number.isFinite(parsedCookingTime) || parsedCookingTime <= 0)
  ) {
    alert("Bitte gib eine gültige Kochzeit ein.");
    return;
  }

  setIsSaving(true);

  try {
    let imageUrl: string | undefined;

    // Bild hochladen
    if (image) {
      const fileExtension =
        image.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeFileName =
        `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

      const filePath = `recipes/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filePath, image, {
          cacheControl: "3600",
          upsert: false,
          contentType: image.type,
        });

      if (uploadError) {
        console.error("Fehler beim Bild-Upload:", uploadError);
        alert(
          `Das Bild konnte nicht hochgeladen werden: ${uploadError.message}`
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    // Rezept in Supabase speichern
    const { data: insertedRecipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        title: title.trim(),
        instructions: instructions.trim(),
        cooking_time: parsedCookingTime ?? null,
        image: imageUrl ?? null,
        favorite: false,
        rating: 0,
      })
      .select("id")
      .single();

    if (recipeError || !insertedRecipe) {
      console.error("Fehler beim Speichern des Rezepts:", recipeError);
      alert(
        `Das Rezept konnte nicht gespeichert werden: ${
          recipeError?.message ?? "Unbekannter Fehler"
        }`
      );
      return;
    }

    const recipeId = insertedRecipe.id;

    // Zutaten in Supabase speichern
    const ingredientsForSupabase = cleanedIngredients.map((ingredient) => ({
      recipe_id: recipeId,
      amount: ingredient.amount || null,
      unit: ingredient.unit || null,
      name: ingredient.name,
    }));

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(ingredientsForSupabase);

    if (ingredientsError) {
      console.error(
        "Fehler beim Speichern der Zutaten:",
        ingredientsError
      );

      alert(
        `Die Zutaten konnten nicht gespeichert werden: ${ingredientsError.message}`
      );
      return;
    }

    // Tags in Supabase speichern
    console.log("Ausgewählte Tags beim Speichern:", selectedTags);
    if (selectedTags.length > 0) {
      const tagsForSupabase = selectedTags.map((tag) => ({
        recipe_id: recipeId,
        tag,
      }));

      const { error: tagsError } = await supabase
        .from("recipe_tags")
        .insert(tagsForSupabase);

      if (tagsError) {
        console.error("Fehler beim Speichern der Tags:", tagsError);
        alert(
          `Die Tags konnten nicht gespeichert werden: ${tagsError.message}`
        );
        return;
      }
    }

    // Vorläufig weiterhin zusätzlich im localStorage speichern
    const savedRecipes = localStorage.getItem("recipes");
    let existingRecipes: Recipe[] = [];

    if (savedRecipes) {
      const parsedRecipes: unknown = JSON.parse(savedRecipes);

      if (Array.isArray(parsedRecipes)) {
        existingRecipes = parsedRecipes as Recipe[];
      }
    }

    const newRecipe: Recipe = {
      id: recipeId,
      title: title.trim(),
      ingredients: cleanedIngredients,
      instructions: instructions.trim(),
      tags: selectedTags,
      favorite: false,
      rating: 0,
      cookingTime: parsedCookingTime,
      image: imageUrl,
    };

    const updatedRecipes = [...existingRecipes, newRecipe];

    localStorage.setItem(
      "recipes",
      JSON.stringify(updatedRecipes)
    );

    router.push(`/rezepte/${recipeId}`);
  } catch (error) {
    console.error("Unerwarteter Fehler:", error);
    alert("Beim Speichern ist ein unerwarteter Fehler aufgetreten.");
  } finally {
    setIsSaving(false);
  }
}
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 pb-28 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-green-700 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-stone-900 sm:text-4xl">
          Neues Rezept
        </h1>
<div className="mb-7 rounded-2xl bg-white p-5 shadow-sm">
  <button
    type="button"
    onClick={() => setShowImport((current) => !current)}
    className="flex w-full items-center justify-between font-semibold text-stone-900"
  >
    <span>Text oder Screenshot importieren</span>
    <span>{showImport ? "−" : "+"}</span>
  </button>

  {showImport && (
    <div className="mt-5">
      <label
  htmlFor="importImage"
  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-5 text-center transition hover:border-green-600 hover:bg-green-50"
>
  <span className="font-medium text-stone-800">
    Screenshot oder Rezeptbild auswählen
  </span>

  <span className="mt-1 text-sm text-stone-500">
    Der Text wird automatisch erkannt
  </span>
</label>

<input
  id="importImage"
  type="file"
  accept="image/*"
  onChange={handleImportImage}
  disabled={isReadingImage}
  className="hidden"
/>

{isReadingImage && (
  <div className="mt-4 rounded-xl bg-green-50 p-4">
    <p className="text-sm font-medium text-green-900">
      Bild wird gelesen: {ocrProgress} %
    </p>

    <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-100">
      <div
        className="h-full bg-green-700 transition-all"
        style={{ width: `${ocrProgress}%` }}
      />
    </div>

    <p className="mt-2 text-xs text-green-800">
      Beim ersten Mal kann das Laden etwas länger dauern.
    </p>
  </div>
)}

<div className="my-5 flex items-center gap-3">
  <div className="h-px flex-1 bg-stone-200" />
  <span className="text-sm text-stone-500">oder Text einfügen</span>
  <div className="h-px flex-1 bg-stone-200" />
</div>
      <label
        htmlFor="importText"
        className="mb-2 block text-sm font-medium text-stone-700"
      >
        Rezepttext einfügen
      </label>

      <textarea
        id="importText"
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
        rows={10}
        placeholder={`Kartoffelsuppe

Zutaten:
500 g Kartoffeln
1 Zwiebel
750 ml Gemüsebrühe

Zubereitung:
Kartoffeln schälen und schneiden.
Alles zusammen kochen.`}
        className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
      />

      <button
        type="button"
        onClick={importRecipeText}
        className="mt-3 w-full rounded-xl bg-stone-800 px-5 py-3 font-medium text-white transition hover:bg-stone-700"
      >
        Text übernehmen
      </button>
    </div>
  )}
</div>
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
              placeholder="Zum Beispiel Kartoffelsuppe"
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
                inputMode="numeric"
                value={cookingTime}
                onChange={(event) => setCookingTime(event.target.value)}
                placeholder="Zum Beispiel 30"
                className="w-full rounded-xl border border-stone-300 bg-white p-3 pr-24 text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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

  <label
    htmlFor="recipeImage"
    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white p-6 text-center transition hover:border-green-600 hover:bg-green-50"
  >
    <span className="font-medium text-stone-800">
      Bild auswählen
    </span>

    <span className="mt-1 text-sm text-stone-500">
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
    <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
      <img
        src={imagePreview}
        alt="Vorschau des Rezeptbildes"
        className="h-64 w-full object-cover"
      />

      <button
        type="button"
        onClick={() => {
          setImage(null);
          setImagePreview("");
        }}
        className="w-full border-t border-stone-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Bild entfernen
      </button>
    </div>
  )}
</div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">Zutaten</h2>

              <button
                type="button"
                onClick={addIngredient}
                className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-200"
              >
                + Zutat
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-white p-3 shadow-sm"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[90px_110px_1fr_auto]">
                    <input
                      value={ingredient.amount}
                      onChange={(event) =>
                        updateIngredient(index, "amount", event.target.value)
                      }
                      placeholder="Menge"
                      className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700"
                    />

                    <input
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateIngredient(index, "unit", event.target.value)
                      }
                      placeholder="Einheit"
                      className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700"
                    />

                    <input
                      value={ingredient.name}
                      onChange={(event) =>
                        updateIngredient(index, "name", event.target.value)
                      }
                      placeholder="Zutat"
                      className="col-span-2 min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700 sm:col-span-1"
                    />

                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                      className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                      aria-label="Zutat entfernen"
                    >
                      Entfernen
                    </button>
                  </div>
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
              onChange={(event) => setInstructions(event.target.value)}
              rows={9}
              placeholder="Beschreibe die einzelnen Schritte..."
              className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-stone-800">Tags</h2>

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
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "bg-green-700 text-white"
                          : "bg-white text-stone-700 hover:bg-stone-50"
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
            disabled={isSaving}
            className="w-full rounded-xl bg-green-700 px-6 py-4 font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Wird gespeichert..." : "Rezept speichern"}
          </button>
        </form>
      </div>
    </main>
  );
}