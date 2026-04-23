"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ClientePedido = {
  razon_social: string | null;
  nombre_comercial: string | null;
};

type Pedido = {
  id: number;
  fecha: string;
  total: number | null;
  estado_deposito: string | null;
  clientes: ClientePedido | ClientePedido[] | null;
};

export default function MisPedidosPage() {
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([]);
  const [pedidosFinalizados, setPedidosFinalizados] = useState<Pedido[]>([]);
  const [vendedor, setVendedor] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarPedidos();
  }, []);

  async function cargarPedidos() {
    setCargando(true);
    setMensaje("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMensaje("No se pudo identificar el usuario actual.");
      setCargando(false);
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("nombre, email")
      .eq("id", user.id)
      .single();

    if (perfilError) {
      setMensaje(`Error cargando perfil: ${perfilError.message}`);
      setCargando(false);
      return;
    }

    const nombreVendedor =
      perfil?.nombre?.trim() || perfil?.email?.trim() || "";

    setVendedor(nombreVendedor);

    const { data: activos, error: activosError } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        total,
        estado_deposito,
        clientes!pedidos_cliente_id_fkey (
          razon_social,
          nombre_comercial
        )
      `)
      .eq("vendedor", nombreVendedor)
      .eq("estado_deposito", "Pendiente de revisión")
      .order("id", { ascending: false });

    if (activosError) {
      setMensaje(`Error cargando pedidos activos: ${activosError.message}`);
      setCargando(false);
      return;
    }

    const { data: finalizados, error: finalizadosError } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        total,
        estado_deposito,
        clientes!pedidos_cliente_id_fkey (
          razon_social,
          nombre_comercial
        )
      `)
      .eq("vendedor", nombreVendedor)
      .eq("estado_deposito", "Pedido terminado")
      .order("id", { ascending: false });

    if (finalizadosError) {
      setMensaje(`Error cargando pedidos finalizados: ${finalizadosError.message}`);
      setCargando(false);
      return;
    }

    setPedidosActivos((activos || []) as Pedido[]);
    setPedidosFinalizados((finalizados || []) as Pedido[]);
    setCargando(false);
  }

  function nombreCliente(pedido: Pedido) {
    const c = Array.isArray(pedido.clientes)
      ? pedido.clientes[0]
      : pedido.clientes;

    return c?.nombre_comercial || c?.razon_social || "Cliente sin nombre";
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Mis pedidos</h1>
          <p className="text-slate-300 mt-2">
            Vendedor: {vendedor || "—"}
          </p>
        </div>

        {mensaje && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="text-slate-400">Cargando pedidos...</div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-3">Activos</h2>

              {!pedidosActivos.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-400">
                  No tienes pedidos activos.
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidosActivos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/deposito/${p.id}`}
                      className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                    >
                      <div className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {nombreCliente(p)}
                          </div>
                          <div className="text-sm text-slate-400">
                            Pedido #{p.id} · {p.fecha}
                          </div>
                        </div>

                        <div className="text-cyan-300 font-semibold shrink-0">
                          USD {Number(p.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3 mt-6">Finalizados</h2>

              {!pedidosFinalizados.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-400">
                  No tienes pedidos finalizados.
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidosFinalizados.map((p) => (
                    <Link
                      key={p.id}
                      href={`/deposito/${p.id}`}
                      className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                    >
                      <div className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {nombreCliente(p)}
                          </div>
                          <div className="text-sm text-slate-400">
                            Pedido #{p.id} · {p.fecha}
                          </div>
                        </div>

                        <div className="text-cyan-300 font-semibold shrink-0">
                          USD {Number(p.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
