"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje(`Error: ${error.message}`);
      setCargando(false);
      return;
    }

    router.push("/auth/callback");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="text-cyan-300 text-sm uppercase tracking-[0.25em]">
          Litium Elite
        </div>

        <h1 className="text-3xl font-semibold mt-3">Iniciar sesión</h1>
        <p className="text-slate-300 mt-2">
          Ingresa con tu usuario y contraseña.
        </p>

        <form onSubmit={iniciarSesion} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Usuario</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="victorventas@litium.local"
              className="w-full h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 outline-none focus:border-cyan-400"
            />
          </div>

          {mensaje && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-200 px-4 py-3">
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full h-12 rounded-2xl bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 disabled:opacity-60"
          >
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
