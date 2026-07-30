"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Ingredient = {
  amount: string;
  unit: string;
  name: string;
};

export default function NeuesRezept() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
      const parsedTags: string[] = JSON.parse(savedTags);
      setAvailableTags(parsedTags);
    } catch {
      setAvailableTags([]);
    }
  }, []);

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

  function removeIngredient(index: number) {
    if (ingredients.length === 1) {
      return;
    }

    setIngredients(
      ingredients.filter((_, ingredientIndex) => ingredientIndex !== index)
    );
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

    setIsSaving(true);

    const { error } = await supabase.from("recipes").insert({
      title: title.trim(),
      ingredients: cleanedIngredients,
      instructions: instructions.trim(),
      tags: selectedTags,
      favorite: false,
      rating: null,
    });

    if (error) {
      console.error("Fehler beim Speichern:", error);
      alert(
        `Das Rezept konnte nicht gespeichert werden: ${error.message}`
      );
      setIsSaving(false);
      return;
    }

    router.push("/");
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

        <h1 className="mb-8 text-4xl font-bold text-stone-900">
          Neues Rezept
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
              placeholder="Zum Beispiel Kartoffelsuppe"
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />
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
                    value={ingredient.amount}
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
                    value={ingredient.unit}
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
                    value={ingredient.name}
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
              placeholder="Beschreibe die einzelnen Schritte..."
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
            disabled={isSaving}
            className="w-full rounded-xl bg-green-700 px-6 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Wird gespeichert..." : "Rezept speichern"}
          </button>
        </form>
      </div>
    </main>
  );
}