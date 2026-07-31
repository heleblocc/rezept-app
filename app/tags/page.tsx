"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TagsPage() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
  async function loadTags() {
    const { data: managedTags, error: managedTagsError } =
      await supabase
        .from("tags")
        .select("name");

    if (managedTagsError) {
      console.error(
        "Tags aus der Tags-Tabelle konnten nicht geladen werden:",
        managedTagsError
      );
    }

    const { data: usedTags, error: usedTagsError } =
      await supabase
        .from("recipe_tags")
        .select("tag");

    if (usedTagsError) {
      console.error(
        "Tags aus Rezepten konnten nicht geladen werden:",
        usedTagsError
      );
    }

    const allTags = [
      ...new Set([
        ...(managedTags ?? [])
          .map((item) => item.name)
          .filter(Boolean),

        ...(usedTags ?? [])
          .map((item) => item.tag)
          .filter(Boolean),
      ]),
    ].sort((a, b) => a.localeCompare(b, "de"));

    setTags(allTags);
  }

  loadTags();
}, []);


  async function addTag(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const cleanedTag = newTag.trim();

  if (!cleanedTag) {
    return;
  }

  const tagAlreadyExists = tags.some(
    (tag) => tag.toLowerCase() === cleanedTag.toLowerCase()
  );

  if (tagAlreadyExists) {
    alert("Diesen Tag gibt es bereits.");
    return;
  }

  const { error } = await supabase
    .from("tags")
    .insert({
      name: cleanedTag,
    });

  if (error) {
    console.error("Tag konnte nicht gespeichert werden:", error);
    alert("Der Tag konnte nicht gespeichert werden.");
    return;
  }

  setTags((currentTags) =>
    [...currentTags, cleanedTag].sort((a, b) =>
      a.localeCompare(b, "de")
    )
  );

  setNewTag("");
}

  async function deleteTag(tagToDelete: string) {
  const confirmed = window.confirm(
    `Möchtest du den Tag „${tagToDelete}“ wirklich löschen?`
  );

  if (!confirmed) {
    return;
  }

  const { error: recipeTagsError } = await supabase
    .from("recipe_tags")
    .delete()
    .eq("tag", tagToDelete);

  if (recipeTagsError) {
    console.error(
      "Tag-Zuordnungen konnten nicht gelöscht werden:",
      recipeTagsError
    );
    alert("Der Tag konnte nicht gelöscht werden.");
    return;
  }

  const { error: tagError } = await supabase
    .from("tags")
    .delete()
    .eq("name", tagToDelete);

  if (tagError) {
    console.error("Tag konnte nicht gelöscht werden:", tagError);
    alert("Der Tag konnte nicht gelöscht werden.");
    return;
  }

  setTags((currentTags) =>
    currentTags.filter((tag) => tag !== tagToDelete)
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

        <h1 className="text-4xl font-bold text-stone-900">
          Tags verwalten
        </h1>

        <p className="mt-2 text-stone-600">
          Erstelle eigene Tags für Länder, Gerichte oder Situationen.
        </p>

        <form
          onSubmit={addTag}
          className="mt-8 flex gap-3"
        >
          <input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="Zum Beispiel Italienisch"
            className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
          />

          <button
            type="submit"
            className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white"
          >
            Hinzufügen
          </button>
        </form>

        <section className="mt-8">
          {tags.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-stone-600">
                Noch keine Tags erstellt.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                >
                  <span className="font-medium text-stone-800">
                    {tag}
                  </span>

                  <button
                    type="button"
                    onClick={() => deleteTag(tag)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}