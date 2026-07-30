"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function TagsPage() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const savedTags = localStorage.getItem("recipe-tags");

    if (savedTags) {
      try {
        const parsedTags: string[] = JSON.parse(savedTags);
        setTags(parsedTags);
      } catch {
        setTags([]);
      }
    }
  }, []);

  function saveTags(updatedTags: string[]) {
    setTags(updatedTags);

    localStorage.setItem(
      "recipe-tags",
      JSON.stringify(updatedTags)
    );
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
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

    const updatedTags = [...tags, cleanedTag].sort((a, b) =>
      a.localeCompare(b, "de")
    );

    saveTags(updatedTags);
    setNewTag("");
  }

  function deleteTag(tagToDelete: string) {
    const confirmed = window.confirm(
      `Möchtest du den Tag „${tagToDelete}“ wirklich löschen?`
    );

    if (!confirmed) {
      return;
    }

    const updatedTags = tags.filter(
      (tag) => tag !== tagToDelete
    );

    saveTags(updatedTags);
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