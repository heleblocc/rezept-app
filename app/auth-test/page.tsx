
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthTestPage() {
  const [result, setResult] = useState("Prüfe Anmeldung...");

  useEffect(() => {
    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setResult("NICHT ANGEMELDET");
        return;
      }

      setResult(
        `ANGEMELDET\nBenutzer-ID: ${data.user.id}`
      );
    }

    checkAuth();
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F4F0] p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#292B29]">
          Anmeldung prüfen
        </h1>

        <pre className="mt-5 whitespace-pre-wrap break-all text-sm text-[#526655]">
          {result}
        </pre>
      </div>
    </main>
  );
}
