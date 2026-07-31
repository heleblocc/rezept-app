"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ShoppingItem = {
  id: string;
  recipeId: number;
  recipeTitle: string;
  amount: string;
  unit: string;
  name: string;
  checked: boolean;
};

type GroupedShoppingItem = {
  key: string;
  ids: string[];
  amount: string;
  unit: string;
  name: string;
  recipeTitles: string[];
  checked: boolean;
};

export default function EinkaufslistePage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [manualAmount, setManualAmount] = useState("");
const [manualUnit, setManualUnit] = useState("");
const [manualName, setManualName] = useState("");

useEffect(() => {
  async function loadShoppingList() {
    try {
      const { data, error } = await supabase
        .from("shopping_list")
        .select(`
          id,
          recipe_id,
          recipe_title,
          amount,
          unit,
          name,
          checked
        `)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      const loadedItems: ShoppingItem[] = (data ?? []).map((item) => ({
        id: item.id,
        recipeId: item.recipe_id ?? 0,
        recipeTitle: item.recipe_title,
        amount: item.amount ?? "",
        unit: item.unit ?? "",
        name: item.name,
        checked: item.checked ?? false,
      }));

      setItems(loadedItems);
    } catch (error) {
      console.error("Einkaufsliste konnte nicht geladen werden:", error);
      setItems([]);
    }

    setLoaded(true);
  }

  loadShoppingList();
}, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, GroupedShoppingItem>();

    for (const item of items) {
      const normalizedName = item.name.trim().toLowerCase();
      const normalizedUnit = item.unit.trim().toLowerCase();
      const key = `${normalizedName}-${normalizedUnit}`;

      const existingGroup = groups.get(key);

      if (!existingGroup) {
        groups.set(key, {
          key,
          ids: [item.id],
          amount: item.amount,
          unit: item.unit,
          name: item.name,
          recipeTitles: [item.recipeTitle],
          checked: item.checked,
        });

        continue;
      }

      existingGroup.ids.push(item.id);

      if (!existingGroup.recipeTitles.includes(item.recipeTitle)) {
        existingGroup.recipeTitles.push(item.recipeTitle);
      }

      const existingAmount = Number(existingGroup.amount.replace(",", "."));
      const newAmount = Number(item.amount.replace(",", "."));

      if (
        Number.isFinite(existingAmount) &&
        Number.isFinite(newAmount) &&
        existingGroup.amount.trim() !== "" &&
        item.amount.trim() !== ""
      ) {
        existingGroup.amount = String(existingAmount + newAmount);
      } else if (item.amount.trim() !== "") {
        existingGroup.amount = `${existingGroup.amount} + ${item.amount}`;
      }

      existingGroup.checked =
        existingGroup.checked && item.checked;
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );
  }, [items]);

  function saveItems(updatedItems: ShoppingItem[]) {
    setItems(updatedItems);

    localStorage.setItem(
      "shopping-list",
      JSON.stringify(updatedItems)
    );
  }
async function addManualItem(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const cleanedName = manualName.trim();

  if (!cleanedName) {
    alert("Bitte gib einen Artikel ein.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("shopping_list")
      .insert({
        recipe_id: null,
        recipe_title: "Manuell hinzugefügt",
        amount: manualAmount.trim(),
        unit: manualUnit.trim(),
        name: cleanedName,
        checked: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newItem: ShoppingItem = {
      id: data.id,
      recipeId: data.recipe_id ?? 0,
      recipeTitle: data.recipe_title,
      amount: data.amount ?? "",
      unit: data.unit ?? "",
      name: data.name,
      checked: data.checked ?? false,
    };

    setItems((currentItems) => [...currentItems, newItem]);

    setManualAmount("");
    setManualUnit("");
    setManualName("");
  } catch (error) {
  console.error("Artikel konnte nicht hinzugefügt werden:", error);

  const message =
    error instanceof Error
      ? error.message
      : JSON.stringify(error);

  alert(`Der Artikel konnte nicht hinzugefügt werden:\n${message}`);
}
}
async function toggleGroup(group: GroupedShoppingItem) {
  const shouldBeChecked = !group.checked;

  try {
    const { error } = await supabase
      .from("shopping_list")
      .update({
        checked: shouldBeChecked,
      })
      .in("id", group.ids);

    if (error) {
      throw error;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        group.ids.includes(item.id)
          ? {
              ...item,
              checked: shouldBeChecked,
            }
          : item
      )
    );
  } catch (error) {
    console.error("Artikel konnte nicht aktualisiert werden:", error);
    alert("Der Artikel konnte nicht aktualisiert werden.");
  }
}

  function deleteGroup(group: GroupedShoppingItem) {
    const updatedItems = items.filter(
      (item) => !group.ids.includes(item.id)
    );

    saveItems(updatedItems);
  }

  function clearCheckedItems() {
    const updatedItems = items.filter((item) => !item.checked);
    saveItems(updatedItems);
  }

  function clearShoppingList() {
    const confirmed = window.confirm(
      "Möchtest du die gesamte Einkaufsliste löschen?"
    );

    if (!confirmed) {
      return;
    }

    saveItems([]);
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-stone-100 p-8">
        Einkaufsliste wird geladen...
      </main>
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

        <div className="flex items-start justify-between gap-5">
          <div>
            <h1 className="text-4xl font-bold text-stone-900">
              Einkaufsliste
            </h1>

            <p className="mt-2 text-stone-600">
              Gleiche Zutaten werden automatisch zusammengefasst.
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearShoppingList}
              className="rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700"
            >
              Alles löschen
            </button>
          )}
        </div>
        <form
  onSubmit={addManualItem}
  className="mt-8 rounded-2xl bg-white p-5 shadow-sm"
>
  <h2 className="text-xl font-semibold text-stone-900">
    Artikel hinzufügen
  </h2>

  <div className="mt-4 grid gap-3 sm:grid-cols-[100px_130px_1fr_auto]">
    <input
      value={manualAmount}
      onChange={(event) => setManualAmount(event.target.value)}
      placeholder="Menge"
      className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
    />

    <input
      value={manualUnit}
      onChange={(event) => setManualUnit(event.target.value)}
      placeholder="Einheit"
      className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
    />

    <input
      value={manualName}
      onChange={(event) => setManualName(event.target.value)}
      placeholder="Zum Beispiel Brot"
      className="min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
    />

    <button
      type="submit"
      className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white"
    >
      Hinzufügen
    </button>
  </div>
</form>

        {groupedItems.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-stone-600">
              Deine Einkaufsliste ist noch leer.
            </p>

            <Link
              href="/"
              className="mt-3 inline-block font-medium text-green-700 hover:underline"
            >
              Rezepte auswählen →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {groupedItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleGroup(item)}
                    className="h-5 w-5"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-stone-900 ${
                        item.checked
                          ? "text-stone-400 line-through"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">
                        {item.amount} {item.unit}
                      </span>{" "}
                      {item.name}
                    </p>

                   <p className="mt-1 text-sm text-stone-500">
  {item.recipeTitles.includes("Manuell hinzugefügt")
    ? "Manuell hinzugefügt"
    : `Für: ${item.recipeTitles.join(", ")}`}
</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteGroup(item)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={clearCheckedItems}
              className="mt-6 rounded-xl bg-stone-200 px-5 py-3 font-medium text-stone-800"
            >
              Abgehakte entfernen
            </button>
          </>
        )}
      </div>
    </main>
  );
}