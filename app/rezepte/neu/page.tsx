
"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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

const newIngredient = (): Ingredient => ({
  amount: "",
  unit: "",
  name: "",
});

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 text-[#292B29] outline-none transition focus:border-[#526655] focus:ring-2 focus:ring-[#E5EAE3]";

const knownUnits = [
  "g", "kg", "ml", "l", "el", "tl",
  "prise", "prisen", "dose", "dosen",
  "packung", "packungen", "stück", "stk",
  "bund", "tasse", "tassen",
];

function parseIngredient(line: string): Ingredient {
  const cleaned = line.replace(/^[-•*]\s*/, "").trim();

  const match = cleaned.match(
    /^(\d+(?:[.,]\d+)?(?:\/\d+)?|½|¼|¾)\s*(.*)$/
  );

  if (!match) {
    return { amount: "", unit: "", name: cleaned };
  }

  const amount = match[1];
  const rest = match[2].trim();
  const parts = rest.split(/\s+/);
  const possibleUnit = parts[0] || "";

  if (knownUnits.includes(possibleUnit.toLowerCase())) {
    return {
      amount,
      unit: possibleUnit,
      name: parts.slice(1).join(" "),
    };
  }

  return { amount, unit: "", name: rest };
}

export default function NeuesRezept() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [instructions, setInstructions] = useState("");

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    newIngredient(),
  ]);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedTags = localStorage.getItem("recipe-tags");
    if (!savedTags) return;

    try {
      const parsed: unknown = JSON.parse(savedTags);
      if (Array.isArray(parsed)) {
        setAvailableTags(
          parsed.filter(
            (tag): tag is string => typeof tag === "string"
          )
        );
      }
    } catch {
      setAvailableTags([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index
          ? { ...ingredient, [field]: value }
          : ingredient
      )
    );
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      newIngredient(),
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((current) =>
      current.length <= 1
        ? current
        : current.filter((_, i) => i !== index)
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  async function handleImportImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Bitte wähle einen Screenshot oder ein Bild aus.");
      return;
    }

    setIsReadingImage(true);
    setOcrProgress(0);

    let worker: Awaited<ReturnType<typeof createWorker>> | null =
      null;

    try {
      worker = await createWorker("deu", 1, {
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
      const text = result.data.text.trim();

      if (!text) {
        alert("Auf dem Bild konnte kein Text erkannt werden.");
        return;
      }

      setImportText(text);
    } catch (error) {
      console.error("Texterkennung fehlgeschlagen:", error);
      alert("Der Text konnte nicht erkannt werden.");
    } finally {
      if (worker) await worker.terminate();
      setIsReadingImage(false);
      event.target.value = "";
    }
  }

  function importRecipeText() {
    const cleaned = importText.trim();

    if (!cleaned) {
      alert("Bitte füge zuerst einen Rezepttext ein.");
      return;
    }

    const lines = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const ingredientsIndex = lines.findIndex((line) =>
      /^(zutaten|ingredients)\s*:?\s*$/i.test(line)
    );

    const instructionsIndex = lines.findIndex((line) =>
      /^(zubereitung|anleitung|zubereitungsweise|instructions)\s*:?\s*$/i.test(
        line
      )
    );

    const headings = [
      ingredientsIndex,
      instructionsIndex,
    ]
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);

    const firstHeading = headings[0];

    const importedTitle =
      firstHeading !== undefined
        ? lines.slice(0, firstHeading).join(" ")
        : lines[0];

    if (importedTitle) setTitle(importedTitle);

    if (ingredientsIndex >= 0) {
      const end =
        instructionsIndex > ingredientsIndex
          ? instructionsIndex
          : lines.length;

      const parsed = lines
        .slice(ingredientsIndex + 1, end)
        .map(parseIngredient)
        .filter((ingredient) => ingredient.name.trim());

      if (parsed.length > 0) {
        setIngredients(parsed);
      }
    }

    if (instructionsIndex >= 0) {
      setInstructions(
        lines.slice(instructionsIndex + 1).join("\n")
      );
    } else if (ingredientsIndex < 0) {
      setInstructions(lines.slice(1).join("\n"));
    }

    setShowImport(false);
  }

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
      .filter((ingredient) => ingredient.name.trim())
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
      cookingTime.trim() === ""
        ? undefined
        : Number(cookingTime);

    if (
      parsedCookingTime !== undefined &&
      (!Number.isFinite(parsedCookingTime) ||
        parsedCookingTime <= 0)
    ) {
      alert("Bitte gib eine gültige Kochzeit ein.");
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl: string | undefined;

      // Rezeptbild hochladen
      if (image) {
        const extension =
          image.name.split(".").pop()?.toLowerCase() || "jpg";

        const fileName =
          `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const filePath = `recipes/${fileName}`;

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
            `Bild-Upload fehlgeschlagen: ${uploadError.message}`
          );
        }

        const { data } = supabase.storage
          .from("recipe-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      // Rezept speichern
      const {
        data: insertedRecipe,
        error: recipeError,
      } = await supabase
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
        throw new Error(
          recipeError?.message ||
            "Rezept konnte nicht gespeichert werden."
        );
      }

      const recipeId = insertedRecipe.id;

      // Zutaten speichern
      const ingredientsForSupabase =
        cleanedIngredients.map((ingredient) => ({
          recipe_id: recipeId,
          amount: ingredient.amount || null,
          unit: ingredient.unit || null,
          name: ingredient.name,
        }));

      const { error: ingredientsError } =
        await supabase
          .from("recipe_ingredients")
          .insert(ingredientsForSupabase);

      if (ingredientsError) {
        throw new Error(
          `Zutaten konnten nicht gespeichert werden: ${ingredientsError.message}`
        );
      }

      // Tags speichern
      if (selectedTags.length > 0) {
        const tagsForSupabase = selectedTags.map((tag) => ({
          recipe_id: recipeId,
          tag,
        }));

        const { error: tagsError } = await supabase
          .from("recipe_tags")
          .insert(tagsForSupabase);

        if (tagsError) {
          throw new Error(
            `Tags konnten nicht gespeichert werden: ${tagsError.message}`
          );
        }
      }

      // Zusätzlich lokal speichern
      let existingRecipes: Recipe[] = [];

      try {
        const saved = localStorage.getItem("recipes");

        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            existingRecipes = parsed as Recipe[];
          }
        }
      } catch (error) {
        console.warn(
          "Lokale Rezepte konnten nicht gelesen werden:",
          error
        );
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

      try {
        localStorage.setItem(
          "recipes",
          JSON.stringify([...existingRecipes, newRecipe])
        );
      } catch (error) {
        console.warn("Lokale Speicherung fehlgeschlagen:", error);
      }

      router.push(`/rezepte/${recipeId}`);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Beim Speichern ist ein Fehler aufgetreten."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F4F0] px-4 py-6 pb-28 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">

        {/* KOPFBEREICH */}
        <Link
          href="/"
          className="mb-5 inline-block text-sm font-medium text-[#526655] hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <h1 className="font-elegant mb-7 text-3xl text-[#292B29] sm:text-4xl">
          Neues Rezept
        </h1>

        {/* REZEPT IMPORTIEREN */}
        <section className="mb-7 rounded-2xl border border-[#E8E5DF] bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowImport((current) => !current)}
            aria-expanded={showImport}
            className="flex w-full items-center justify-between text-left font-semibold text-[#292B29]"
          >
            <span>Text oder Screenshot importieren</span>
            <span className="text-xl text-[#526655]">
              {showImport ? "−" : "+"}
            </span>
          </button>

          {showImport && (
            <div className="mt-5 space-y-4">
              <label
                htmlFor="importImage"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B4C0B2] bg-[#F6F4F0] p-5 text-center transition hover:bg-[#E5EAE3]"
              >
                <span className="font-medium text-[#292B29]">
                  Screenshot oder Rezeptbild auswählen
                </span>

                <span className="mt-1 text-sm text-[#858780]">
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
                <div className="rounded-xl bg-[#E5EAE3] p-4">
                  <p className="text-sm font-medium text-[#526655]">
                    Bild wird gelesen: {ocrProgress} %
                  </p>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full bg-[#526655] transition-all"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E8E5DF]" />
                <span className="text-sm text-[#858780]">
                  oder Text einfügen
                </span>
                <div className="h-px flex-1 bg-[#E8E5DF]" />
              </div>

              <label
                htmlFor="importText"
                className="block text-sm font-medium text-[#292B29]"
              >
                Rezepttext einfügen
              </label>

              <textarea
                id="importText"
                value={importText}
                onChange={(event) =>
                  setImportText(event.target.value)
                }
                rows={9}
                placeholder={`Kartoffelsuppe

Zutaten:
500 g Kartoffeln
1 Zwiebel
750 ml Gemüsebrühe

Zubereitung:
Kartoffeln schälen und schneiden.
Alles zusammen kochen.`}
                className={`${inputClass} resize-y`}
              />

              <button
                type="button"
                onClick={importRecipeText}
                className="w-full rounded-xl bg-[#526655] px-5 py-3 font-medium text-white transition hover:bg-[#3D5041]"
              >
                Text übernehmen
              </button>
            </div>
          )}
        </section>

        {/* REZEPTFORMULAR */}
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
              placeholder="Zum Beispiel Kartoffelsuppe"
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
                placeholder="Zum Beispiel 30"
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
                Bild auswählen
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
                  alt="Vorschau des Rezeptbildes"
                  className="h-64 w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview("");
                  }}
                  className="w-full border-t border-[#E8E5DF] px-4 py-3 text-sm font-medium text-[#956B62] hover:bg-[#F4EEEB]"
                >
                  Bild entfernen
                </button>
              </div>
            )}
          </section>

          {/* ZUTATEN: EIN EINZIGER BLOCK */}
          <section className="flex flex-col">
            <h2 className="mb-3 font-semibold text-[#292B29]">
              Zutaten
            </h2>

            {/* 1. ZUERST ALLE ZUTATEN */}
            <div className="order-1 space-y-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#E8E5DF] bg-white p-3 shadow-sm"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[90px_110px_1fr_auto]">

                    <input
                      value={ingredient.amount}
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

                    <input
                      value={ingredient.unit}
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

                    <input
                      value={ingredient.name}
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

            {/* 2. DANACH DER HINZUFÜGEN-BUTTON */}
            <button
              type="button"
              onClick={addIngredient}
              className="order-2 mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B4C0B2] bg-[#E5EAE3] px-4 py-3 text-sm font-medium text-[#526655] transition hover:bg-[#DCE5DA]"
            >
              <span className="text-xl leading-none">+</span>
              Zutat hinzufügen
            </button>
          </section>

          {/* 3. ERST DANACH DIE ZUBEREITUNG */}
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
                  const selected = selectedTags.includes(tag);

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={selected}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-[#526655] bg-[#526655] text-white"
                          : "border-[#E8E5DF] bg-white text-[#526655] hover:bg-[#E5EAE3]"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* REZEPT SPEICHERN */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[#526655] px-6 py-4 font-semibold text-white transition hover:bg-[#3D5041] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Wird gespeichert..."
              : "Rezept speichern"}
          </button>
        </form>
      </div>
    </main>
  );
}
