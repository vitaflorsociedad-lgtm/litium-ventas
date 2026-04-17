"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: number;
  fecha: string;
  vendedor: string | null;
  estado: string;
  estado_deposito: string | null;
  subtotal: number | null;
  descuento_porcentaje: number | null;
  descuento_monto: number | null;
  total: number | null;
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
  producto_id: number | null;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

const money = (n?: number | null) => `USD ${Number(n || 0).toFixed(2)}`;

const hoy = new Date();
const yyyy = hoy.getFullYear();
const mm = String(hoy.getMonth() + 1).padStart(2, "0");
const dd = String(hoy.getDate()).padStart(2, "0");
const hoyStr = `${yyyy}-${mm}-${dd}`;

const ayerDate = new Date();
ayerDate.setDate(ayerDate.getDate() - 1);
const yyyyA = ayerDate.getFullYear();
const mmA = String(ayerDate.getMonth() + 1).padStart(2, "0");
const ddA = String(ayerDate.getDate()).padStart(2, "0");
const ayerStr = `${yyyyA}-${mmA}-${ddA}`;

export default function DepositoPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [itemsPorPedido, setItemsPorPedido] = useState<Record<number, Item[]>>({});
  const [cargando, setCargando] = useState(false);
  const [guardandoPedido, setGuardandoPedido] = useState<number | null>(null);
  const [finalizandoPedido, setFinalizandoPedido] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const [filtroRapido, setFiltroRapido] = useState<"hoy" | "ayer" | "rango">("hoy");
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);
  const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | "Pendiente de revisión" | "Pedido terminado">("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  useEffect(() => {
    if (filtroRapido === "hoy") {
      setFechaDesde(hoyStr);
      setFechaHasta(hoyStr);
    } else if (filtroRapido === "ayer") {
      setFechaDesde(ayerStr);
      setFechaHasta(ayerStr);
    }
  }, [filtroRapido]);

  async function cargarTodo() {
    setCargando(true);

    const { data: pedidosData, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        vendedor,
        estado,
        estado_deposito,
        subtotal,
        descuento_porcentaje,
        descuento_monto,
        total,
        observaciones,
        clientes!pedidos_cliente_id_fkey (
          rut,
          razon_social,
          nombre_comercial,
          telefono
        )
      `)
      .order("id", { ascending: false });

    if (error) {
      setMensaje(`Error cargando pedidos: ${error.message}`);
      setCargando(false);
      return;
    }

    const pedidosList = ((pedidosData || []) as any[]).map((p) => ({
      ...p,
      clientes: Array.isArray(p.clientes) ? p.clientes[0] : p.clientes,
    })) as Pedido[];

    setPedidos(pedidosList);

    const ids = pedidosList.map((p) => p.id);

    if (ids.length) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("pedido_items")
        .select("*")
        .in("pedido_id", ids)
        .order("id", { ascending: true });

      if (itemsError) {
        setMensaje(`Error cargando detalle: ${itemsError.message}`);
        setCargando(false);
        return;
      }

      const agrupado: Record<number, Item[]> = {};

      (itemsData || []).forEach((item: any) => {
        if (!agrupado[item.pedido_id]) agrupado[item.pedido_id] = [];
        agrupado[item.pedido_id].push(item);
      });

      setItemsPorPedido(agrupado);
    } else {
      setItemsPorPedido({});
    }

    setCargando(false);
  }

  function cambiarCantidadLocal(pedidoId: number, itemId: number, cantidad: number) {
    setItemsPorPedido((prev) => {
      const lista = prev[pedidoId] || [];

      const nueva = lista.map((item) =>
        item.id === itemId
          ? {
              ...item,
              cantidad: cantidad < 1 ? 1 : cantidad,
              subtotal: (cantidad < 1 ? 1 : cantidad) * Number(item.precio_unitario || 0),
            }
          : item
      );

      return {
        ...prev,
        [pedidoId]: nueva,
      };
    });
  }

  function eliminarItemLocal(pedidoId: number, itemId: number) {
    setItemsPorPedido((prev) => {
      const lista = prev[pedidoId] || [];

      return {
        ...prev,
        [pedidoId]: lista.filter((item) => item.id !== itemId),
      };
    });
  }

  async function guardarAjustesPedido(pedidoId: number) {
    const items = itemsPorPedido[pedidoId] || [];
    const pedido = pedidos.find((p) => p.id === pedidoId);

    if (!pedido) {
      setMensaje("No se encontró el pedido.");
      return;
    }

    setGuardandoPedido(pedidoId);

    const { data: actualesData, error: actualesError } = await supabase
      .from("pedido_items")
      .select("id")
      .eq("pedido_id", pedidoId);

    if (actualesError) {
      setGuardandoPedido(null);
      setMensaje(`Error leyendo items actuales: ${actualesError.message}`);
      return;
    }

    const actualesIds = (actualesData || []).map((x: any) => x.id);
    const nuevosIds = items.map((x) => x.id);

    const idsABorrar = actualesIds.filter((id: number) => !nuevosIds.includes(id));

    if (idsABorrar.length) {
      const { error: deleteError } = await supabase
        .from("pedido_items")
        .delete()
        .in("id", idsABorrar);

      if (deleteError) {
        setGuardandoPedido(null);
        setMensaje(`Error borrando items: ${deleteError.message}`);
        return;
      }
    }

    for (const item of items) {
      const { error } = await supabase
        .from("pedido_items")
        .update({
          cantidad: item.cantidad,
          subtotal: item.subtotal,
        })
        .eq("id", item.id);

      if (error) {
        setGuardandoPedido(null);
        setMensaje(`Error actualizando items: ${error.message}`);
        return;
      }
    }

    const subtotalNuevo = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const descuentoPorcentaje = Number(pedido.descuento_porcentaje || 0);
    const descuentoMonto = subtotalNuevo * (descuentoPorcentaje / 100);
    const totalNuevo = subtotalNuevo - descuentoMonto;

    const { error: pedidoError } = await supabase
      .from("pedidos")
      .update({
        subtotal: subtotalNuevo,
        descuento_monto: descuentoMonto,
        total: totalNuevo,
      })
      .eq("id", pedidoId);

    if (pedidoError) {
      setGuardandoPedido(null);
      setMensaje(`Error actualizando pedido: ${pedidoError.message}`);
      return;
    }

    setGuardandoPedido(null);
    setMensaje(`Pedido #${pedidoId} actualizado correctamente.`);
    await cargarTodo();
  }

  async function finalizarPedido(pedidoId: number) {
    setFinalizandoPedido(pedidoId);

    const { error } = await supabase
      .from("pedidos")
      .update({ estado_deposito: "Pedido terminado" })
      .eq("id", pedidoId);

    if (error) {
      setFinalizandoPedido(null);
      setMensaje(`Error finalizando pedido: ${error.message}`);
      return;
    }

    setFinalizandoPedido(null);
    setMensaje(`Pedido #${pedidoId} finalizado correctamente.`);
    await cargarTodo();
  }

  function imprimirPedido(pedido: Pedido, items: Item[]) {
    const subtotalLocal = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const descuentoPorcentaje = Number(pedido.descuento_porcentaje || 0);
    const descuentoMontoLocal = subtotalLocal * (descuentoPorcentaje / 100);
    const totalLocal = subtotalLocal - descuentoMontoLocal;

    const filas = items
      .map(
        (item) => `
          <tr>
            <td>${item.codigo || ""}</td>
            <td>${item.nombre || ""}</td>
            <td style="text-align:center;">${item.cantidad || 0}</td>
            <td style="text-align:right;">${money(item.precio_unitario)}</td>
            <td style="text-align:right;">${money(item.subtotal)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Pedido #${pedido.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111;
            }
            h1, h2, h3 {
              margin: 0 0 10px 0;
            }
            .top {
              margin-bottom: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
              margin-bottom: 20px;
            }
            .box {
              border: 1px solid #ddd;
              padding: 10px 12px;
              border-radius: 10px;
            }
            .label {
              font-size: 12px;
              color: #555;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .value {
              font-size: 15px;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              font-size: 14px;
            }
            th {
              background: #f3f3f3;
              text-align: left;
            }
            .summary {
              margin-top: 20px;
              width: 320px;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
            }
            .summary-total {
              font-size: 18px;
              font-weight: 700;
            }
            .notes {
              margin-top: 26px;
            }
            .notes-box {
              border: 1px solid #ddd;
              min-height: 80px;
              border-radius: 10px;
              padding: 10px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="top">
            <h1>Pedido #${pedido.id}</h1>
            <p><strong>Estado depósito:</strong> ${pedido.estado_deposito || "Pendiente de revisión"}</p>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">Fecha</div>
              <div class="value">${pedido.fecha || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Vendedor</div>
              <div class="value">${pedido.vendedor || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Cliente</div>
              <div class="value">${pedido.clientes?.nombre_comercial || pedido.clientes?.razon_social || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Razón social</div>
              <div class="value">${pedido.clientes?.razon_social || "-"}</div>
            </div>
            <div class="box">
              <div class="label">RUT</div>
              <div class="value">${pedido.clientes?.rut || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Teléfono</div>
              <div class="value">${pedido.clientes?.telefono || "-"}</div>
            </div>
          </div>

          <h3>Detalle del pedido</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 110px;">Código</th>
                <th>Producto</th>
                <th style="width: 90px; text-align:center;">Cantidad</th>
                <th style="width: 120px; text-align:right;">P. Unitario</th>
                <th style="width: 120px; text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${money(subtotalLocal)}</span>
            </div>
            <div class="summary-row">
              <span>Descuento</span>
              <span>${descuentoPorcentaje.toFixed(2)}%</span>
            </div>
            <div class="summary-row">
              <span>Monto descuento</span>
              <span>- ${money(descuentoMontoLocal)}</span>
            </div>
            <div class="summary-row summary-total">
              <span>Total final</span>
              <span>${money(totalLocal)}</span>
            </div>
          </div>

          <div class="notes">
            <h3>Observaciones</h3>
            <div class="notes-box">
              ${pedido.observaciones || ""}
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      const fecha = pedido.fecha || "";
      const clienteNombre = (pedido.clientes?.nombre_comercial || "").toLowerCase();
      const razonSocial = (pedido.clientes?.razon_social || "").toLowerCase();
      const rut = (pedido.clientes?.rut || "").toLowerCase();
      const vendedor = (pedido.vendedor || "").toLowerCase();
      const q = busqueda.trim().toLowerCase();

      const pasaFecha =
        (!fechaDesde || fecha >= fechaDesde) &&
        (!fechaHasta || fecha <= fechaHasta);

      const pasaEstado =
        estadoFiltro === "Todos" || pedido.estado_deposito === estadoFiltro;

      const pasaBusqueda =
        !q ||
        clienteNombre.includes(q) ||
        razonSocial.includes(q) ||
        rut.includes(q) ||
        vendedor.includes(q) ||
        String(pedido.id).includes(q);

      return pasaFecha && pasaEstado && pasaBusqueda;
    });
  }, [pedidos, fechaDesde, fechaHasta, estadoFiltro, busqueda]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-5 md:px-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Depósito</h1>
            <p className="text-white/60 mt-1">
              Revisión, corrección, impresión y cierre final del pedido.
            </p>
          </div>

          <button
            onClick={cargarTodo}
            className="h-11 rounded-2xl bg-white text-black px-5 font-semibold hover:bg-zinc-200"
          >
            Recargar
          </button>
        </div>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="grid xl:grid-cols-[200px_170px_170px_220px_1fr] gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 block mb-2">
                Filtro rápido
              </label>
              <select
                value={filtroRapido}
                onChange={(e) => setFiltroRapido(e.target.value as "hoy" | "ayer" | "rango")}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none text-white"
              >
                <option value="hoy">Hoy</option>
                <option value="ayer">Ayer</option>
                <option value="rango">Rango manual</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 block mb-2">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFiltroRapido("rango");
                  setFechaDesde(e.target.value);
                }}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none text-white"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 block mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFiltroRapido("rango");
                  setFechaHasta(e.target.value);
                }}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none text-white"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 block mb-2">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(
                    e.target.value as "Todos" | "Pendiente de revisión" | "Pedido terminado"
                  )
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Pendiente de revisión">Pendiente de revisión</option>
                <option value="Pedido terminado">Pedido terminado</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 block mb-2">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente, RUT, vendedor o pedido"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 px-4 py-3">
            {mensaje}
          </div>
        )}

        {cargando && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            Cargando pedidos...
          </div>
        )}

        {!pedidosFiltrados.length && !cargando && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
            No hay pedidos para ese filtro.
          </div>
        )}

        <div className="space-y-4">
          {pedidosFiltrados.map((pedido) => {
            const items = itemsPorPedido[pedido.id] || [];
            const subtotalLocal = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
            const descuentoPorcentaje = Number(pedido.descuento_porcentaje || 0);
            const descuentoMontoLocal = subtotalLocal * (descuentoPorcentaje / 100);
            const totalLocal = subtotalLocal - descuentoMontoLocal;
            const terminado = pedido.estado_deposito === "Pedido terminado";

            return (
              <section
                key={pedido.id}
                className="rounded-[24px] border border-white/10 bg-white/5 p-4"
              >
                <div className="grid lg:grid-cols-[1fr_260px] gap-4">
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2 items-start">
                    <MiniCardCompact label="Pedido" value={`#${pedido.id}`} />
                    <MiniCardCompact label="Fecha" value={pedido.fecha || "-"} />
                    <MiniCardCompact label="Vendedor" value={pedido.vendedor || "-"} />
                    <MiniCardCompact label="Cliente" value={pedido.clientes?.nombre_comercial || pedido.clientes?.razon_social || "-"} />
                    <MiniCardCompact label="RUT" value={pedido.clientes?.rut || "-"} />
                    <MiniCardCompact label="Teléfono" value={pedido.clientes?.telefono || "-"} />
                    <MiniCardCompact label="Estado pedido" value={pedido.estado || "-"} />
                    <MiniCardCompact label="Depósito" value={pedido.estado_deposito || "Pendiente de revisión"} />
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Subtotal</span>
                        <span>{money(subtotalLocal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Descuento</span>
                        <span>{descuentoPorcentaje.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Monto desc.</span>
                        <span>- {money(descuentoMontoLocal)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                        <span>Total</span>
                        <span className="text-cyan-300">{money(totalLocal)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => imprimirPedido(pedido, items)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 text-white px-5 font-semibold hover:bg-white/10"
                    >
                      Imprimir pedido
                    </button>

                    {!terminado ? (
                      <button
                        onClick={() => finalizarPedido(pedido.id)}
                        disabled={finalizandoPedido === pedido.id}
                        className="h-11 w-full rounded-2xl bg-cyan-400 text-black px-5 font-semibold hover:bg-cyan-300 disabled:opacity-60"
                      >
                        {finalizandoPedido === pedido.id ? "Finalizando..." : "Finalizar pedido"}
                      </button>
                    ) : (
                      <div className="h-11 w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 px-5 font-semibold flex items-center justify-center">
                        Pedido terminado
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {!items.length && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/60">
                      Este pedido no tiene items.
                    </div>
                  )}

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 grid md:grid-cols-[90px_1fr_110px_130px_130px_auto] gap-3 items-center"
                    >
                      <div className="text-sm text-white/50">{item.codigo}</div>

                      <div>
                        <div className="font-semibold text-sm">{item.nombre}</div>
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        disabled={terminado}
                        onChange={(e) =>
                          cambiarCantidadLocal(
                            pedido.id,
                            item.id,
                            Number(e.target.value)
                          )
                        }
                        className="h-10 rounded-2xl border border-white/10 bg-black/40 px-3 outline-none text-center disabled:opacity-50"
                      />

                      <div className="text-right text-sm">{money(item.precio_unitario)}</div>
                      <div className="text-right font-semibold text-cyan-300">{money(item.subtotal)}</div>

                      <button
                        onClick={() => eliminarItemLocal(pedido.id, item.id)}
                        disabled={terminado}
                        className="h-10 rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300 px-4 font-semibold hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        Borrar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => guardarAjustesPedido(pedido.id)}
                    disabled={guardandoPedido === pedido.id || terminado}
                    className="h-10 rounded-2xl bg-white text-black px-5 font-semibold hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {guardandoPedido === pedido.id ? "Guardando..." : "Guardar ajustes"}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function MiniCardCompact({ label, value }: { label: string; value: string }) {
  return (
    <div className="self-start rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-white/40 leading-none">
        {label}
      </div>
      <div className="text-sm font-semibold mt-1 truncate leading-tight">
        {value}
      </div>
    </div>
  );
}