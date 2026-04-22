"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  rut: string;
  razon_social: string;
  nombre_comercial: string | null;
  telefono: string | null;
  saldo_pendiente: number | null;
};

type Factura = {
  id: number;
  cliente_id: number;
  estado: string;
  monto: number;
};

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  linea: string | null;
  precio: number | null;
  moneda: string | null;
  stock: number | null;
  activo: boolean | null;
  imagen_url: string | null;
};

type ItemCarrito = {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  moneda: string | null;
  cantidad: number;
  subtotal: number;
  imagen_url: string | null;
};

const money = (n?: number | null, moneda?: string | null) => {
  const value = Number(n || 0);
  return `${moneda || "USD"} ${value.toFixed(2)}`;
};

export default function PedidosPage() {
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [carrito, setCarrito] = useState<Record<string, ItemCarrito>>({});
  const [vendedor, setVendedor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  const clienteBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 4500);
    return () => clearTimeout(t);
  }, [mensaje]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!clienteBoxRef.current) return;
      if (!clienteBoxRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const texto = busquedaCliente.trim();

    if (!texto) {
      setClientesEncontrados([]);
      return;
    }

    const timer = setTimeout(() => {
      buscarClientesEnVivo(texto);
    }, 250);

    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje(`Error cargando productos: ${error.message}`);
      return;
    }

    setProductos((data || []) as Producto[]);
  }

  async function buscarClientesEnVivo(texto: string) {
    const q = texto.trim();

    if (!q) {
      setClientesEncontrados([]);
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("id, rut, razon_social, nombre_comercial, telefono, saldo_pendiente")
      .or(
        `rut.ilike.%${q}%,razon_social.ilike.%${q}%,nombre_comercial.ilike.%${q}%`
      )
      .order("razon_social", { ascending: true })
      .limit(12);

    if (error) {
      setClientesEncontrados([]);
      return;
    }

    setClientesEncontrados((data || []) as Cliente[]);
    setMostrarDropdown(true);
  }

  async function seleccionarCliente(clienteElegido: Cliente) {
    setCliente(clienteElegido);
    setBusquedaCliente(
      clienteElegido.nombre_comercial ||
        clienteElegido.razon_social ||
        clienteElegido.rut
    );
    setMostrarDropdown(false);

    const { data: facturasData, error } = await supabase
      .from("facturas")
      .select("id, cliente_id, estado, monto")
      .eq("cliente_id", clienteElegido.id);

    if (error) {
      setFacturas([]);
      setMensaje(`Cliente cargado, pero falló la lectura de facturas: ${error.message}`);
      return;
    }

    setFacturas((facturasData || []) as Factura[]);
    setMensaje("Cliente cargado correctamente.");
  }

  function limpiarCliente() {
    setCliente(null);
    setFacturas([]);
    setBusquedaCliente("");
    setClientesEncontrados([]);
    setMostrarDropdown(false);
  }

  function agregarProducto(producto: Producto) {
    setCarrito((prev) => {
      const key = String(producto.id);
      const actual = prev[key];

      if (actual) {
        const cantidad = actual.cantidad + 1;
        return {
          ...prev,
          [key]: {
            ...actual,
            cantidad,
            subtotal: cantidad * Number(actual.precio || 0),
          },
        };
      }

      return {
        ...prev,
        [key]: {
          id: Number(producto.id),
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio: Number(producto.precio || 0),
          moneda: producto.moneda || "USD",
          cantidad: 1,
          subtotal: Number(producto.precio || 0),
          imagen_url: producto.imagen_url || null,
        },
      };
    });
  }

  function quitarProducto(id: number) {
    setCarrito((prev) => {
      const key = String(id);
      const actual = prev[key];
      if (!actual) return prev;

      if (actual.cantidad <= 1) {
        const nuevo = { ...prev };
        delete nuevo[key];
        return nuevo;
      }

      const cantidad = actual.cantidad - 1;

      return {
        ...prev,
        [key]: {
          ...actual,
          cantidad,
          subtotal: cantidad * Number(actual.precio || 0),
        },
      };
    });
  }

  function cambiarCantidad(id: number, valor: number) {
    setCarrito((prev) => {
      const key = String(id);
      const actual = prev[key];
      if (!actual) return prev;

      const cantidad = valor < 1 ? 1 : valor;

      return {
        ...prev,
        [key]: {
          ...actual,
          cantidad,
          subtotal: cantidad * Number(actual.precio || 0),
        },
      };
    });
  }

  function vaciarPedido() {
    setCarrito({});
    setObservaciones("");
    setDescuentoPorcentaje(0);
    setMensaje("Pedido vaciado.");
  }

  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase();
    if (!q) return productos;

    return productos.filter((p) => {
      const codigo = (p.codigo || "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      const categoria = (p.categoria || "").toLowerCase();
      const linea = (p.linea || "").toLowerCase();

      return (
        codigo.includes(q) ||
        nombre.includes(q) ||
        categoria.includes(q) ||
        linea.includes(q)
      );
    });
  }, [productos, busquedaProducto]);

  const items = Object.values(carrito);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  }, [items]);

  const descuentoMonto = useMemo(() => {
    return subtotal * (descuentoPorcentaje / 100);
  }, [subtotal, descuentoPorcentaje]);

  const total = useMemo(() => {
    return subtotal - descuentoMonto;
  }, [subtotal, descuentoMonto]);

  const deuda = Number(cliente?.saldo_pendiente || 0);

  const vencido = useMemo(() => {
    return facturas
      .filter((f) => f.estado === "Vencida")
      .reduce((acc, f) => acc + Number(f.monto || 0), 0);
  }, [facturas]);

  async function guardarPedido(estado: "Borrador" | "Enviado") {
    if (!cliente) {
      setMensaje("Debes cargar un cliente antes de guardar el pedido.");
      return;
    }

    if (!items.length) {
      setMensaje("Debes agregar al menos un producto.");
      return;
    }

    setGuardando(true);

    const { data: pedidoCreado, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([
        {
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          vendedor: vendedor.trim() || null,
          estado,
          subtotal: subtotal,
          descuento_porcentaje: descuentoPorcentaje,
          descuento_monto: descuentoMonto,
          total: total,
          observaciones: observaciones.trim() || null,
        },
      ])
      .select()
      .single();

    if (errorPedido) {
      setGuardando(false);
      setMensaje(`Error guardando pedido: ${errorPedido.message}`);
      return;
    }

    const pedidoId = pedidoCreado.id;

    const payloadItems = items.map((item) => ({
      pedido_id: pedidoId,
      producto_id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.subtotal,
    }));

    const { error: errorItems } = await supabase
      .from("pedido_items")
      .insert(payloadItems);

    if (errorItems) {
      setGuardando(false);
      setMensaje(`Pedido creado, pero falló el detalle: ${errorItems.message}`);
      return;
    }

    if (estado === "Enviado") {
      try {
        const resp = await fetch("/api/notificar-pedido", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pedidoId }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => null);
          setMensaje(
            `Pedido guardado pero falló el email: ${errorData?.error || "error desconocido"}`
          );
        }
      } catch (e: any) {
        setMensaje(`Pedido guardado pero falló el email: ${e?.message || "error desconocido"}`);
      }
    }

    setCarrito({});
    setObservaciones("");
    setDescuentoPorcentaje(0);
    setGuardando(false);
    setMensaje(`Pedido ${estado === "Borrador" ? "guardado como borrador" : "enviado"} correctamente.`);
  }

  return (
    <main className="min-h-screen bg-black text-white px-3 py-4 md:px-5">
      <div className="max-w-7xl mx-auto space-y-4">
        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="grid lg:grid-cols-[1.2fr_1fr_auto] gap-3 items-end">
            <div className="relative" ref={clienteBoxRef}>
              <label className="text-xs uppercase tracking-wider text-white/50 block mb-2">
                Cliente
              </label>

              <input
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  setMostrarDropdown(true);
                  if (cliente && e.target.value !== busquedaCliente) {
                    setCliente(null);
                    setFacturas([]);
                  }
                }}
                onFocus={() => {
                  if (clientesEncontrados.length) setMostrarDropdown(true);
                }}
                placeholder="Buscar por RUT, razón social o nombre comercial"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none focus:border-cyan-400"
              />

              {mostrarDropdown && busquedaCliente.trim() && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
                  {clientesEncontrados.length > 0 ? (
                    <div className="max-h-80 overflow-auto">
                      {clientesEncontrados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => seleccionarCliente(c)}
                          className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <div className="font-semibold text-sm">
                            {c.nombre_comercial || c.razon_social}
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            {c.razon_social} · RUT: {c.rut}
                          </div>
                          {c.telefono && (
                            <div className="text-xs text-white/40 mt-1">
                              Tel: {c.telefono}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-white/50">
                      No se encontraron clientes.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <MiniCard label="RUT" value={cliente?.rut || "-"} />
              <MiniCard label="Nombre" value={cliente?.nombre_comercial || "-"} />
              <MiniCard label="Razón social" value={cliente?.razon_social || "-"} />
              <MiniCard label="Teléfono" value={cliente?.telefono || "-"} />
              <MiniCard label="Deuda" value={money(deuda, "USD")} />
              <MiniCard label="Vencido" value={money(vencido, "USD")} />
            </div>

            <button
              onClick={limpiarCliente}
              className="h-11 rounded-2xl bg-white text-black px-5 font-semibold hover:bg-zinc-200"
            >
              Limpiar
            </button>
          </div>

          {mensaje && (
            <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 px-4 py-3 text-sm">
              {mensaje}
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Pedidos</h1>
              <p className="text-white/55 text-sm mt-1">
                Toca un producto para sumarlo. Si lo tocas 5 veces, suma 5 unidades.
              </p>
            </div>

            <input
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              placeholder="Buscar por código, nombre o línea"
              className="h-11 w-full md:w-96 rounded-2xl border border-white/10 bg-black/40 px-4 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[58vh] overflow-auto pr-1">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarProducto(p)}
                className="group rounded-[22px] border border-white/10 bg-black/35 overflow-hidden text-left hover:bg-white/10 transition"
              >
                <div className="aspect-square bg-zinc-900 relative flex items-center justify-center">
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="px-3 text-center">
                      <div className="text-[11px] text-white/40">{p.codigo}</div>
                      <div className="text-sm font-semibold text-white/90 mt-1 line-clamp-3">
                        {p.nombre}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-[11px] px-2 py-1">
                    {carrito[String(p.id)]?.cantidad || 0}
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-[11px] text-white/40">{p.codigo}</div>
                  <div className="font-semibold text-sm leading-tight mt-1 line-clamp-2">
                    {p.nombre}
                  </div>
                  <div className="text-[12px] text-white/45 mt-1 line-clamp-1">
                    {p.linea || p.categoria || "Sin línea"}
                  </div>
                  <div className="text-cyan-300 font-semibold mt-2">
                    {money(p.precio, p.moneda)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Resumen del pedido</h2>
                <div className="text-right">
                  <div className="text-xs text-white/45">Total final</div>
                  <div className="text-2xl font-semibold text-cyan-300">
                    {money(total, "USD")}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[280px] overflow-auto pr-1">
                {!items.length && (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/55">
                    Todavía no agregaste productos.
                  </div>
                )}

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-white/40">{item.codigo}</div>
                      <div className="font-semibold text-sm truncate">{item.nombre}</div>
                      <div className="text-cyan-300 text-sm mt-1">
                        {money(item.subtotal, item.moneda)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => quitarProducto(item.id)}
                        className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-lg"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => cambiarCantidad(item.id, Number(e.target.value))}
                        className="h-9 w-16 rounded-xl border border-white/10 bg-black/40 text-center outline-none"
                      />

                      <button
                        onClick={() =>
                          agregarProducto({
                            id: item.id,
                            codigo: item.codigo,
                            nombre: item.nombre,
                            precio: item.precio,
                            moneda: item.moneda,
                            descripcion: null,
                            categoria: null,
                            linea: null,
                            stock: 0,
                            activo: true,
                            imagen_url: item.imagen_url,
                          })
                        }
                        className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Subtotal</span>
                  <span className="font-semibold">{money(subtotal, "USD")}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">Descuento</span>
                  <select
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                    className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 outline-none text-white"
                  >
                    <option value={0}>0%</option>
                    <option value={15}>15%</option>
                    <option value={23}>23%</option>
                    <option value={30}>30%</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/60">Monto descuento</span>
                  <span className="font-semibold text-amber-300">- {money(descuentoMonto, "USD")}</span>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-white font-semibold">Total final</span>
                  <span className="text-2xl font-semibold text-cyan-300">{money(total, "USD")}</span>
                </div>
              </div>

              <input
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                placeholder="Vendedor"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none focus:border-cyan-400"
              />

              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones del pedido"
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-400"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                <button
                  onClick={vaciarPedido}
                  className="h-11 rounded-2xl border border-white/10 bg-white/5 font-semibold"
                >
                  Vaciar
                </button>

                <button
                  onClick={() => guardarPedido("Borrador")}
                  disabled={guardando}
                  className="h-11 rounded-2xl border border-white/10 bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                >
                  Guardar borrador
                </button>

                <button
                  onClick={() => guardarPedido("Enviado")}
                  disabled={guardando}
                  className="h-11 rounded-2xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 disabled:opacity-60"
                >
                  Enviar pedido
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-sm font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}