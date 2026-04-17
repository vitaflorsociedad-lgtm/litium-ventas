"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Building2,
  Receipt,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  rut: string;
  razon_social: string;
  nombre_comercial: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  zona: string | null;
  condicion_pago: string | null;
  limite_credito: number | null;
  saldo_pendiente: number | null;
  estado: string | null;
  vendedor_asignado: string | null;
  observaciones: string | null;
};

type Factura = {
  id: number;
  cliente_id: number;
  numero: string;
  fecha: string;
  vencimiento: string | null;
  monto: number;
  estado: string;
  observaciones: string | null;
};

type Cobro = {
  id: number;
  cliente_id: number;
  factura_id: number | null;
  fecha: string;
  monto: number;
  medio_pago: string | null;
  referencia: string | null;
  observaciones: string | null;
};

const pesos = (n?: number | null) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n || 0);

const emptyClientForm = {
  rut: "",
  razon_social: "",
  nombre_comercial: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  zona: "",
  condicion_pago: "Contado",
  limite_credito: "0",
  estado: "Activo",
  vendedor_asignado: "",
  observaciones: "",
};

const emptyInvoiceForm = {
  numero: "",
  fecha: new Date().toISOString().slice(0, 10),
  vencimiento: "",
  monto: "",
  estado: "Pendiente",
  observaciones: "",
};

const emptyPaymentForm = {
  fecha: new Date().toISOString().slice(0, 10),
  monto: "",
  medio_pago: "Transferencia",
  referencia: "",
  observaciones: "",
};

export default function ClientesPage() {
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [mode, setMode] = useState<"new" | "edit">("new");

  const clienteBoxRef = useRef<HTMLDivElement | null>(null);

  const deudaVencida = useMemo(
    () =>
      facturas
        .filter((f) => f.estado === "Vencida")
        .reduce((acc, f) => acc + Number(f.monto), 0),
    [facturas]
  );

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

  async function buscarClientesEnVivo(texto: string) {
    const q = texto.trim();

    if (!q) {
      setClientesEncontrados([]);
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
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

  async function cargarClienteCompleto(clienteElegido: Cliente) {
    setLoading(true);
    setMessage("");

    setCliente(clienteElegido);
    setMode("edit");
    setBusquedaclienteVisual(clienteElegido);

    setClientForm({
      rut: clienteElegido.rut || "",
      razon_social: clienteElegido.razon_social || "",
      nombre_comercial: clienteElegido.nombre_comercial || "",
      contacto: clienteElegido.contacto || "",
      telefono: clienteElegido.telefono || "",
      email: clienteElegido.email || "",
      direccion: clienteElegido.direccion || "",
      zona: clienteElegido.zona || "",
      condicion_pago: clienteElegido.condicion_pago || "Contado",
      limite_credito: String(clienteElegido.limite_credito || 0),
      estado: clienteElegido.estado || "Activo",
      vendedor_asignado: clienteElegido.vendedor_asignado || "",
      observaciones: clienteElegido.observaciones || "",
    });

    const { data: inv } = await supabase
      .from("facturas")
      .select("*")
      .eq("cliente_id", clienteElegido.id)
      .order("fecha", { ascending: false });

    const { data: pay } = await supabase
      .from("cobros")
      .select("*")
      .eq("cliente_id", clienteElegido.id)
      .order("fecha", { ascending: false });

    setFacturas((inv || []) as Factura[]);
    setCobros((pay || []) as Cobro[]);
    setMostrarDropdown(false);
    setMessage("Cliente encontrado. Ficha cargada correctamente.");
    setLoading(false);
  }

  function setBusquedaclienteVisual(clienteElegido: Cliente) {
    setBusquedaCliente(
      clienteElegido.nombre_comercial ||
        clienteElegido.razon_social ||
        clienteElegido.rut
    );
  }

  function limpiarBusquedaCliente() {
    setCliente(null);
    setFacturas([]);
    setCobros([]);
    setMode("new");
    setBusquedaCliente("");
    setClientesEncontrados([]);
    setMostrarDropdown(false);
    setClientForm(emptyClientForm);
    setInvoiceForm(emptyInvoiceForm);
    setPaymentForm(emptyPaymentForm);
    setMessage("");
  }

  async function guardarCliente() {
    setLoading(true);
    setMessage("");

    const payload = {
      rut: clientForm.rut.trim(),
      razon_social: clientForm.razon_social.trim(),
      nombre_comercial: clientForm.nombre_comercial.trim() || null,
      contacto: clientForm.contacto.trim() || null,
      telefono: clientForm.telefono.trim() || null,
      email: clientForm.email.trim() || null,
      direccion: clientForm.direccion.trim() || null,
      zona: clientForm.zona.trim() || null,
      condicion_pago: clientForm.condicion_pago.trim() || "Contado",
      limite_credito: Number(clientForm.limite_credito || 0),
      estado: clientForm.estado.trim() || "Activo",
      vendedor_asignado: clientForm.vendedor_asignado.trim() || null,
      observaciones: clientForm.observaciones.trim() || null,
    };

    if (mode === "new") {
      const { error } = await supabase.from("clientes").insert([payload]);
      if (error) {
        setMessage(`Error creando cliente: ${error.message}`);
      } else {
        setMessage("Cliente creado correctamente.");
        setBusquedaCliente(payload.nombre_comercial || payload.razon_social || payload.rut);

        const { data: nuevoCliente } = await supabase
          .from("clientes")
          .select("*")
          .eq("rut", payload.rut)
          .maybeSingle();

        if (nuevoCliente) {
          await cargarClienteCompleto(nuevoCliente as Cliente);
        } else {
          setClientForm(emptyClientForm);
        }
      }
    } else if (cliente) {
      const { error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", cliente.id);

      if (error) {
        setMessage(`Error actualizando cliente: ${error.message}`);
      } else {
        const { data: actualizado } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", cliente.id)
          .maybeSingle();

        if (actualizado) {
          await cargarClienteCompleto(actualizado as Cliente);
        } else {
          setMessage("Cliente actualizado correctamente.");
        }
      }
    }

    setLoading(false);
  }

  async function crearFactura() {
    if (!cliente) {
      setMessage("Primero busca o crea un cliente.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("facturas").insert([
      {
        cliente_id: cliente.id,
        numero: invoiceForm.numero.trim(),
        fecha: invoiceForm.fecha,
        vencimiento: invoiceForm.vencimiento || null,
        monto: Number(invoiceForm.monto || 0),
        estado: invoiceForm.estado,
        observaciones: invoiceForm.observaciones.trim() || null,
      },
    ]);

    if (error) {
      setMessage(`Error creando factura: ${error.message}`);
    } else {
      setMessage("Factura registrada correctamente.");
      setInvoiceForm(emptyInvoiceForm);
      await cargarClienteCompleto(cliente);
    }
    setLoading(false);
  }

  async function registrarCobro() {
    if (!cliente) {
      setMessage("Primero busca o crea un cliente.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("cobros").insert([
      {
        cliente_id: cliente.id,
        fecha: paymentForm.fecha,
        monto: Number(paymentForm.monto || 0),
        medio_pago: paymentForm.medio_pago,
        referencia: paymentForm.referencia.trim() || null,
        observaciones: paymentForm.observaciones.trim() || null,
      },
    ]);

    if (error) {
      setMessage(`Error registrando cobro: ${error.message}`);
    } else {
      setMessage("Cobro registrado correctamente.");
      setPaymentForm(emptyPaymentForm);
      await cargarClienteCompleto(cliente);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-cyan-300 text-sm uppercase tracking-[0.25em]">
                  Litium Elite
                </div>
                <h1 className="text-3xl font-semibold mt-2">
                  Clientes, facturas y deuda
                </h1>
                <p className="text-slate-300 mt-2">
                  Busca por RUT, razón social o nombre comercial. Si existe,
                  la ficha se abre. Si no existe, puedes crear el cliente nuevo.
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-cyan-300" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] mt-6">
              <div className="relative" ref={clienteBoxRef}>
                <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarDropdown(true);
                    if (cliente && e.target.value !== busquedaCliente) {
                      setCliente(null);
                      setFacturas([]);
                      setCobros([]);
                      setMode("new");
                    }
                  }}
                  onFocus={() => {
                    if (clientesEncontrados.length) setMostrarDropdown(true);
                  }}
                  placeholder="Buscar por RUT, razón social o nombre comercial"
                  className="w-full h-12 rounded-2xl border border-white/10 bg-slate-900/70 pl-10 pr-4 outline-none focus:border-cyan-400"
                />

                {mostrarDropdown && busquedaCliente.trim() && (
                  <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">
                    {clientesEncontrados.length > 0 ? (
                      <div className="max-h-80 overflow-auto">
                        {clientesEncontrados.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => cargarClienteCompleto(c)}
                            className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
                          >
                            <div className="font-semibold text-sm">
                              {c.nombre_comercial || c.razon_social}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {c.razon_social} · RUT: {c.rut}
                            </div>
                            {c.telefono && (
                              <div className="text-xs text-slate-500 mt-1">
                                Tel: {c.telefono}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-400">
                        No se encontraron clientes.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={limpiarBusquedaCliente}
                className="h-12 rounded-2xl bg-cyan-400 text-slate-950 font-semibold px-5 hover:bg-cyan-300"
              >
                Limpiar
              </button>
            </div>

            {message && (
              <div
                className={`mt-4 rounded-2xl p-4 border ${
                  message.toLowerCase().includes("error")
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {message}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Resumen del cliente</h2>
            {!cliente ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-slate-200">
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <AlertCircle className="h-5 w-5" /> Sin cliente seleccionado
                </div>
                <p className="text-sm text-slate-300 mt-2">
                  Busca por RUT, razón social o nombre comercial para cargar la
                  ficha o crear un cliente nuevo.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <Metric
                  label="Saldo pendiente"
                  value={pesos(cliente.saldo_pendiente)}
                  tone="rose"
                />
                <Metric
                  label="Deuda vencida"
                  value={pesos(deudaVencida)}
                  tone="amber"
                />
                <Metric
                  label="Límite de crédito"
                  value={pesos(cliente.limite_credito)}
                  tone="cyan"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold">Alta y edición de cliente</h2>
                <p className="text-slate-300 mt-1">
                  Modo actual: {mode === "new" ? "nuevo cliente" : "edición de cliente"}
                </p>
              </div>
              <button
                onClick={guardarCliente}
                className="rounded-2xl bg-cyan-400 text-slate-950 font-semibold px-5 py-3 hover:bg-cyan-300"
              >
                Guardar cliente
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <Field label="RUT" value={clientForm.rut} onChange={(v) => setClientForm({ ...clientForm, rut: v })} />
              <Field label="Razón social" value={clientForm.razon_social} onChange={(v) => setClientForm({ ...clientForm, razon_social: v })} />
              <Field label="Nombre comercial" value={clientForm.nombre_comercial} onChange={(v) => setClientForm({ ...clientForm, nombre_comercial: v })} />
              <Field label="Contacto" value={clientForm.contacto} onChange={(v) => setClientForm({ ...clientForm, contacto: v })} />
              <Field label="Teléfono" value={clientForm.telefono} onChange={(v) => setClientForm({ ...clientForm, telefono: v })} />
              <Field label="Email" value={clientForm.email} onChange={(v) => setClientForm({ ...clientForm, email: v })} />
              <Field label="Dirección" value={clientForm.direccion} onChange={(v) => setClientForm({ ...clientForm, direccion: v })} />
              <Field label="Zona" value={clientForm.zona} onChange={(v) => setClientForm({ ...clientForm, zona: v })} />
              <Field label="Condición de pago" value={clientForm.condicion_pago} onChange={(v) => setClientForm({ ...clientForm, condicion_pago: v })} />
              <Field label="Límite de crédito" value={clientForm.limite_credito} onChange={(v) => setClientForm({ ...clientForm, limite_credito: v })} />
              <Field label="Estado" value={clientForm.estado} onChange={(v) => setClientForm({ ...clientForm, estado: v })} />
              <Field label="Vendedor asignado" value={clientForm.vendedor_asignado} onChange={(v) => setClientForm({ ...clientForm, vendedor_asignado: v })} />
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-300 block mb-2">
                Observaciones
              </label>
              <textarea
                value={clientForm.observaciones}
                onChange={(e) =>
                  setClientForm({ ...clientForm, observaciones: e.target.value })
                }
                className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none focus:border-cyan-400"
                placeholder="Notas, acuerdos de pago, comentarios comerciales"
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">Crear factura</h2>
                  <p className="text-slate-300 mt-1">
                    La factura queda asociada al cliente cargado.
                  </p>
                </div>
                <button
                  onClick={crearFactura}
                  className="rounded-2xl bg-cyan-400 text-slate-950 font-semibold px-5 py-3 hover:bg-cyan-300"
                >
                  <Receipt className="inline h-4 w-4 mr-2" /> Guardar factura
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <Field label="Número" value={invoiceForm.numero} onChange={(v) => setInvoiceForm({ ...invoiceForm, numero: v })} />
                <Field label="Fecha" value={invoiceForm.fecha} onChange={(v) => setInvoiceForm({ ...invoiceForm, fecha: v })} type="date" />
                <Field label="Vencimiento" value={invoiceForm.vencimiento} onChange={(v) => setInvoiceForm({ ...invoiceForm, vencimiento: v })} type="date" />
                <Field label="Monto" value={invoiceForm.monto} onChange={(v) => setInvoiceForm({ ...invoiceForm, monto: v })} />
                <Field label="Estado" value={invoiceForm.estado} onChange={(v) => setInvoiceForm({ ...invoiceForm, estado: v })} />
                <Field label="Observaciones" value={invoiceForm.observaciones} onChange={(v) => setInvoiceForm({ ...invoiceForm, observaciones: v })} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">Registrar cobro</h2>
                  <p className="text-slate-300 mt-1">
                    Se descuenta automáticamente del saldo pendiente.
                  </p>
                </div>
                <button
                  onClick={registrarCobro}
                  className="rounded-2xl bg-cyan-400 text-slate-950 font-semibold px-5 py-3 hover:bg-cyan-300"
                >
                  <Wallet className="inline h-4 w-4 mr-2" /> Guardar cobro
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <Field label="Fecha" value={paymentForm.fecha} onChange={(v) => setPaymentForm({ ...paymentForm, fecha: v })} type="date" />
                <Field label="Monto" value={paymentForm.monto} onChange={(v) => setPaymentForm({ ...paymentForm, monto: v })} />
                <Field label="Medio de pago" value={paymentForm.medio_pago} onChange={(v) => setPaymentForm({ ...paymentForm, medio_pago: v })} />
                <Field label="Referencia" value={paymentForm.referencia} onChange={(v) => setPaymentForm({ ...paymentForm, referencia: v })} />
                <Field label="Observaciones" value={paymentForm.observaciones} onChange={(v) => setPaymentForm({ ...paymentForm, observaciones: v })} />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Facturas del cliente</h2>
            <div className="mt-4 space-y-3">
              {facturas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-6 text-slate-300">
                  No hay facturas cargadas.
                </div>
              ) : (
                facturas.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <div className="font-semibold">{f.numero}</div>
                      <div className="text-sm text-slate-400">
                        Fecha: {f.fecha} · Vencimiento: {f.vencimiento || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{pesos(f.monto)}</div>
                      <div className="text-sm text-slate-400">{f.estado}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Cobros del cliente</h2>
            <div className="mt-4 space-y-3">
              {cobros.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-6 text-slate-300">
                  No hay cobros cargados.
                </div>
              ) : (
                cobros.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <div className="font-semibold">{c.medio_pago || "Cobro"}</div>
                      <div className="text-sm text-slate-400">
                        Fecha: {c.fecha} · Ref: {c.referencia || "-"}
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      {pesos(c.monto)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm text-slate-300 block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 outline-none focus:border-cyan-400"
        placeholder={label}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "rose" | "amber" | "cyan";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
      ? "text-amber-300"
      : "text-cyan-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-2 ${toneClass}`}>{value}</div>
    </div>
  );
}