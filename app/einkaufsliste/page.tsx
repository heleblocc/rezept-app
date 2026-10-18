
"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 text-[#292B29] outline-none transition focus:border-[#526655] focus:ring-2 focus:ring-[#E5EAE3]";

export default function EinkaufslistePage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [manualAmount, setManualAmount] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [manualName, setManualName] = useState("");

  // EINKAUFSLISTE AUS SUPABASE LADEN
  useEffect(() => {
    let cancelled = false;

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

        if (error) throw error;

        const loadedItems: ShoppingItem[] = (data ?? []).map(
          (item) => ({
            id: String(item.id),
            recipeId: item.recipe_id ?? 0,
            recipeTitle: item.recipe_title ?? "",
            amount: String(item.amount ?? ""),
            unit: item.unit ?? "",
            name: item.name ?? "",
            checked: item.checked ?? false,
          })
        );

        if (!cancelled) {
          setItems(loadedItems);
          localStorage.setItem(
            "shopping-list",
            JSON.stringify(loadedItems)
          );
        }
      } catch (error) {
        console.error(
          "Einkaufsliste konnte nicht geladen werden:",
          error
        );

        if (!cancelled) {
          alert("Die Einkaufsliste konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadShoppingList();

    return () => {
      cancelled = true;
    };
  }, []);

  // GLEICHE ZUTATEN ZUSAMMENFASSEN
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

      const existingAmount = Number(
        existingGroup.amount.replace(",", ".")
      );

      const newAmount = Number(
        item.amount.replace(",", ".")
      );

      if (
        Number.isFinite(existingAmount) &&
        Number.isFinite(newAmount) &&
        existingGroup.amount.trim() !== "" &&
        item.amount.trim() !== ""
      ) {
        existingGroup.amount = String(
          existingAmount + newAmount
        );
      } else if (item.amount.trim() !== "") {
        existingGroup.amount =
          `${existingGroup.amount} + ${item.amount}`;
      }

      existingGroup.checked =
        existingGroup.checked && item.checked;
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );
  }, [items]);

  // ZUSTAND UND LOKALEN SPEICHER AKTUALISIEREN
  function saveItems(updatedItems: ShoppingItem[]) {
    setItems(updatedItems);

    try {
      localStorage.setItem(
        "shopping-list",
        JSON.stringify(updatedItems)
      );
    } catch (error) {
      console.warn(
        "Lokale Einkaufsliste konnte nicht gespeichert werden:",
        error
      );
    }
  }

  // ARTIKEL MANUELL HINZUFÜGEN
  async function addManualItem(
    event: FormEvent<HTMLFormElement>
  ) {
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

      if (error) throw error;

      const newItem: ShoppingItem = {
        id: String(data.id),
        recipeId: data.recipe_id ?? 0,
        recipeTitle: data.recipe_title ?? "",
        amount: String(data.amount ?? ""),
        unit: data.unit ?? "",
        name: data.name ?? "",
        checked: data.checked ?? false,
      };

      saveItems([...items, newItem]);

      setManualAmount("");
      setManualUnit("");
      setManualName("");
    } catch (error) {
      console.error(
        "Artikel konnte nicht hinzugefügt werden:",
        error
      );

      alert(
        error instanceof Error
          ? `Der Artikel konnte nicht hinzugefügt werden: ${error.message}`
          : "Der Artikel konnte nicht hinzugefügt werden."
      );
    }
  }

  // ARTIKEL ABHAKEN
  async function toggleGroup(group: GroupedShoppingItem) {
    const shouldBeChecked = !group.checked;

    try {
      const { error } = await supabase
        .from("shopping_list")
        .update({
          checked: shouldBeChecked,
        })
        .in("id", group.ids);

      if (error) throw error;

      const updatedItems = items.map((item) =>
        group.ids.includes(item.id)
          ? {
              ...item,
              checked: shouldBeChecked,
            }
          : item
      );

      saveItems(updatedItems);
    } catch (error) {
      console.error(
        "Artikel konnte nicht aktualisiert werden:",
        error
      );

      alert("Der Artikel konnte nicht aktualisiert werden.");
    }
  }

  // EINZELNE ZUTAT ODER GRUPPE LÖSCHEN
  async function deleteGroup(group: GroupedShoppingItem) {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .in("id", group.ids);

      if (error) throw error;

      const updatedItems = items.filter(
        (item) => !group.ids.includes(item.id)
      );

      saveItems(updatedItems);
    } catch (error) {
      console.error(
        "Artikel konnte nicht gelöscht werden:",
        error
      );

      alert("Der Artikel konnte nicht gelöscht werden.");
    }
  }

  // ABGEHAKTE ARTIKEL ENTFERNEN
  async function clearCheckedItems() {
    const checkedIds = items
      .filter((item) => item.checked)
      .map((item) => item.id);

    if (checkedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .in("id", checkedIds);

      if (error) throw error;

      const updatedItems = items.filter(
        (item) => !item.checked
      );

      saveItems(updatedItems);
    } catch (error) {
      console.error(
        "Abgehakte Artikel konnten nicht entfernt werden:",
        error
      );

      alert("Abgehakte Artikel konnten nicht entfernt werden.");
    }
  }

  // GESAMTE EINKAUFSLISTE LÖSCHEN
  async function clearShoppingList() {
    if (isClearing || items.length === 0) return;

    const confirmed = window.confirm(
      "Möchtest du wirklich die gesamte Einkaufsliste löschen? Alle Artikel werden dauerhaft entfernt."
    );

    if (!confirmed) return;

    setIsClearing(true);

    try {
      // Nur die IDs der tatsächlich geladenen Artikel löschen.
      // Dadurch funktioniert die Abfrage auch mit UUID-Spalten.
      const ids = items.map((item) => item.id);

      const { data: deletedItems, error } = await supabase
        .from("shopping_list")
        .delete()
        .in("id", ids)
        .select("id");

      if (error) throw error;

      const deletedIds = new Set(
        (deletedItems ?? []).map((item) => String(item.id))
      );

      // Sicherstellen, dass Supabase die Einträge
      // tatsächlich gelöscht hat.
      if (deletedIds.size !== ids.length) {
        throw new Error(
          "Nicht alle Artikel konnten gelöscht werden. Bitte prüfe die Zugriffsrechte in Supabase."
        );
      }

      // Auch den lokalen Speicher vollständig leeren.
      saveItems([]);
    } catch (error) {
      console.error(
        "Einkaufsliste konnte nicht gelöscht werden:",
        error
      );

      alert(
        error instanceof Error
          ? `Die Einkaufsliste konnte nicht vollständig gelöscht werden: ${error.message}`
          : "Die Einkaufsliste konnte nicht gelöscht werden."
      );

      // Nach einem Fehler den tatsächlichen Datenbankstand laden.
      try {
        const { data, error: reloadError } = await supabase
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

        if (!reloadError) {
          saveItems(
            (data ?? []).map((item) => ({
              id: String(item.id),
              recipeId: item.recipe_id ?? 0,
              recipeTitle: item.recipe_title ?? "",
              amount: String(item.amount ?? ""),
              unit: item.unit ?? "",
              name: item.name ?? "",
              checked: item.checked ?? false,
            }))
          );
        }
      } catch (reloadError) {
        console.error(
          "Einkaufsliste konnte nicht neu geladen werden:",
          reloadError
        );
      }
    } finally {
      setIsClearing(false);
    }
  }

  // LADEANSICHT
  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#F6F4F0] p-8 text-[#526655]">
        Einkaufsliste wird geladen...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F4F0] px-4 py-6 pb-28 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">

        {/* ZURÜCK */}
        <Link
          href="/"
          className="mb-5 inline-block text-sm font-medium text-[#526655] hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        {/* ÜBERSCHRIFT */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#292B29] sm:text-4xl">
              Einkaufsliste
            </h1>

            <p className="mt-2 text-sm text-[#858780]">
              Gleiche Zutaten werden automatisch zusammengefasst.
            </p>
          </div>

          {/* ALLES LÖSCHEN */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearShoppingList}
              disabled={isClearing}
              className="rounded-xl border border-[#EADBD6] bg-[#F4EEEB] px-4 py-3 text-sm font-medium text-[#956B62] transition hover:bg-[#EDE2DD] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearing
                ? "Wird gelöscht..."
                : "Alles löschen"}
            </button>
          )}
        </div>

        {/* MANUELLEN ARTIKEL HINZUFÜGEN */}
        <form
          onSubmit={addManualItem}
          className="mt-8 rounded-2xl border border-[#E8E5DF] bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-[#292B29]">
            Artikel hinzufügen
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-[100px_130px_1fr_auto]">
            <input
              value={manualAmount}
              onChange={(event) =>
                setManualAmount(event.target.value)
              }
              placeholder="Menge"
              aria-label="Menge"
              className={inputClass}
            />

            <input
              value={manualUnit}
              onChange={(event) =>
                setManualUnit(event.target.value)
              }
              placeholder="Einheit"
              aria-label="Einheit"
              className={inputClass}
            />

            <input
              value={manualName}
              onChange={(event) =>
                setManualName(event.target.value)
              }
              placeholder="Zum Beispiel Brot"
              aria-label="Artikelname"
              className={inputClass}
            />

            <button
              type="submit"
              className="rounded-xl bg-[#526655] px-5 py-3 font-medium text-white transition hover:bg-[#3D5041]"
            >
              Hinzufügen
            </button>
          </div>
        </form>

        {/* LEERE EINKAUFSLISTE */}
        {groupedItems.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#E8E5DF] bg-white p-6 shadow-sm">
            <p className="text-[#858780]">
              Deine Einkaufsliste ist noch leer.
            </p>

            <Link
              href="/"
              className="mt-3 inline-block font-medium text-[#526655] hover:underline"
            >
              Rezepte auswählen →
            </Link>
          </div>
        ) : (
          <>
            {/* EINKAUFSARTIKEL */}
            <div className="mt-8 space-y-3">
              {groupedItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-[#E8E5DF] bg-white p-4 shadow-sm sm:gap-4"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleGroup(item)}
                    aria-label={`${item.name} abhaken`}
                    className="h-5 w-5 shrink-0 accent-[#526655]"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[#292B29] ${
                        item.checked
                          ? "text-[#858780] line-through"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">
                        {item.amount} {item.unit}
                      </span>{" "}
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-[#858780] sm:text-sm">
                      {item.recipeTitles.includes(
                        "Manuell hinzugefügt"
                      )
                        ? "Manuell hinzugefügt"
                        : `Für: ${item.recipeTitles.join(", ")}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteGroup(item)}
                    aria-label={`${item.name} löschen`}
                    className="shrink-0 rounded-lg bg-[#F4EEEB] px-3 py-2 text-sm font-medium text-[#956B62] transition hover:bg-[#EDE2DD]"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>

            {/* ABGEHAKTE ARTIKEL ENTFERNEN */}
            <button
              type="button"
              onClick={clearCheckedItems}
              disabled={!items.some((item) => item.checked)}
              className="mt-6 rounded-xl border border-[#E8E5DF] bg-white px-5 py-3 font-medium text-[#526655] transition hover:bg-[#E5EAE3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Abgehakte entfernen
            </button>
          </>
        )}
      </div>
    </main>
  );
}
