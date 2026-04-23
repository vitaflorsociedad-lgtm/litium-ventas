"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: number;
  fecha: string;
  vendedor: string | null;
  estado: string;
  estado_deposito: string | null;
  observaciones: string | null;
  clientes: {
    rut: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    telefono: string | null;
  } | null;
};

type Item = {
  id: number;
  pedido_id: number;
  codigo: string;
  nombre: string;
  cantidad: number;
};

export default function DepositoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const pedidoId = Number(params.id);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarPedido();
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  async function cargarPedido() {
    setCargando(true);

    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        vendedor,
        estado,
        estado_deposito,
        observaciones,
        clientes!pedidos_cliente_id_fkey (
          rut,
          razon_social,
          nombre_comercial,
          telefono
        )
      `)
      .eq("id", pedidoId)
      .single();

    if (pedidoError) {
      setMensaje(`Error cargando pedido: ${pedidoError.message}`);
      setCargando(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("pedido_items")
      .select("id, pedido_id, codigo, nombre, cantidad")
      .eq("pedido_id", pedidoId)
      .order("id", { ascending: true });

    if (itemsError) {
      setMensaje(`Error cargando items: ${itemsError.message}`);
      setCargando(false);
      return;
    }

    setPedido({
      ...(pedidoData as any),
      clientes: Array.isArray((pedidoData as any).clientes)
        ? (pedidoData as any).clientes[0]
        : (pedidoData as any).clientes,
    });

    setItems((itemsData || []) as Item[]);
    setCargando(false);
  }

  function cambiarCantidad(itemId: number, valor: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, cantidad: valor < 1 ? 1 : valor }
          : item
      )
    );
  }

  function eliminarItemLocal(itemId: number) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  async function guardarAjustes() {
    if (!pedido) return;

    setGuardando(true);

    const { data: actualesData, error: actualesError } = await supabase
      .from("pedido_items")
      .select("id")
      .eq("pedido_id", pedidoId);

    if (actualesError) {
      setMensaje(`Error leyendo items actuales: ${actualesError.message}`);
      setGuardando(false);
      return;
    }

    const actualesIds = (actualesData || []).map((x: any) => x.id);
    const nuevosIds = items.map((x) => x.id);

    const idsABorrar = actualesIds.filter((id: number) => !nuevosIds.includes(id));

    if (idsABorrar.length > 0) {
      const { error: deleteError } = await supabase
        .from("pedido_items")
        .delete()
        .in("id", idsABorrar);

      if (deleteError) {
        setMensaje(`Error borrando items: ${deleteError.message}`);
        setGuardando(false);
        return;
      }
    }

    for (const item of items) {
      const { error } = await supabase
        .from("pedido_items")
        .update({ cantidad: item.cantidad })
        .eq("id", item.id);

      if (error) {
        setMensaje(`Error actualizando items: ${error.message}`);
        setGuardando(false);
        return;
      }
    }

    setMensaje("Ajustes guardados correctamente.");
    setGuardando(false);
    await cargarPedido();
  }

  async function finalizarPedido() {
    if (!window.confirm("¿Seguro que quieres finalizar este pedido?")) return;

    setFinalizando(true);

    const { error } = await supabase
      .from("pedidos")
      .update({ estado_deposito: "Pedido terminado" })
      .eq("id", pedidoId);

    if (error) {
      setMensaje(`Error finalizando pedido: ${error.message}`);
      setFinalizando(false);
      return;
    }

    window.location.href = "/deposito";
  }

  async function eliminarPedido() {
    if (!window.confirm("¿Seguro que quieres eliminar este pedido? Esta acción no se puede deshacer.")) return;

    setEliminando(true);

    const { error: itemsError } = await supabase
      .from("pedido_items")
      .delete()
      .eq("pedido_id", pedidoId);

    if (itemsError) {
      setMensaje(`Error borrando items: ${itemsError.message}`);
      setEliminando(false);
      return;
    }

    const { error: pedidoError } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", pedidoId);

    if (pedidoError) {
      setMensaje(`Error borrando pedido: ${pedidoError.message}`);
      setEliminando(false);
      return;
    }

    window.location.href = "/deposito";
  }

  const cliente = pedido?.clientes;
  const nombreCliente =
    cliente?.nombre_comercial ||
    cliente?.razon_social ||
    cliente?.rut ||
    "Cliente sin nombre";

  const esPendiente = pedido?.estado_deposito === "Pendiente de revisión";

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href={esPendiente ? "/deposito" : "/deposito/finalizados"}
              className="text-cyan-300 text-sm hover:underline"
            >
              ← Volver
            </Link>

            <h1 className="text-3xl font-semibold mt-3">
              {nombreCliente}
            </h1>

            <p className="text-slate-300 mt-2">
              Pedido #{pedido?.id || pedidoId}
            </p>
          </div>

          {esPendiente && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={guardarAjustes}
                disabled={guardando}
                className="h-11 px-5 rounded-2xl bg-white text-slate-950 font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar ajustes"}
              </button>

              <button
                onClick={finalizarPedido}
                disabled={finalizando}
                className="h-11 px-5 rounded-2xl bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 transition disabled:opacity-60"
              >
                {finalizando ? "Finalizando..." : "Finalizar pedido"}
              </button>

              <button
                onClick={eliminarPedido}
                disabled={eliminando}
                className="h-11 px-5 rounded-2xl bg-rose-500 text-white font-semibold hover:bg-rose-400 transition disabled:opacity-60"
              >
                {eliminando ? "Eliminando..." : "Eliminar pedido"}
              </button>
            </div>
          )}
        </div>

        {mensaje && (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 px-4 py-3">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Cargando pedido...
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                <MiniCard label="RUT" value={cliente?.rut || "-"} />
                <MiniCard label="Nombre" value={nombreCliente} />
                <MiniCard label="Teléfono" value={cliente?.telefono || "-"} />
                <MiniCard label="Fecha" value={pedido?.fecha || "-"} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold mb-4">Productos</h2>

              {!items.length ? (
                <div className="text-slate-400">Este pedido no tiene items.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 grid grid-cols-[90px_1fr_110px_auto] gap-3 items-center"
                    >
                      <div className="text-sm text-slate-400">{item.codigo}</div>

                      <div className="font-semibold">{item.nombre}</div>

                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        disabled={!esPendiente}
                        onChange={(e) =>
                          cambiarCantidad(item.id, Number(e.target.value))
                        }
                        className="h-10 rounded-2xl border border-white/10 bg-black/40 px-3 outline-none text-center disabled:opacity-50"
                      />

                      {esPendiente ? (
                        <button
                          onClick={() => eliminarItemLocal(item.id)}
                          className="h-10 rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300 px-4 font-semibold hover:bg-rose-500/20"
                        >
                          Borrar
                        </button>
                      ) : (
                        <div className="h-10 px-4 flex items-center justify-center text-slate-500">
                          —
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pedido?.observaciones && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold mb-2">Observaciones</h2>
                <p className="text-slate-300">{pedido.observaciones}</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="text-sm font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}