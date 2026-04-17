"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="h-10 px-4 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-400 transition"
    >
      Cerrar sesión
    </button>
  );
}