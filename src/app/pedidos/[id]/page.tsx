"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Pedido = any;
type Cliente = any;
type Item = any;

const money = (n?: number | null) => `USD ${Number(n || 0).toFixed(2)}`;

export default function PedidoVistaCliente() {
  const params = useParams();
  const pedidoId = Number(params?.id);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarPedido();
  }, []);

  async function cargarPedido() {
    setCargando(true);

    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedidoData) {
      setError(`No se pudo cargar el pedido: ${pedidoError?.message || ""}`);
      setCargando(false);
      return;
    }

    const { data: clienteData } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", pedidoData.cliente_id)
      .single();

    const { data: itemsData } = await supabase
      .from("pedido_items")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("id", { ascending: true });

    setPedido(pedidoData);
    setCliente(clienteData);
    setItems(itemsData || []);
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        Cargando presupuesto...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        <div className="text-red-600 font-bold">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black p-6 print:p-0">
      <div className="max-w-4xl mx-auto bg-white">
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Litium</h1>
            <p className="text-sm text-gray-600">Italy Designed</p>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-bold">Presupuesto</h2>
            <p>Pedido #{pedido?.id}</p>
            <p>Fecha: {pedido?.fecha}</p>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-bold mb-2">Cliente</h3>
            <p>{cliente?.nombre_comercial || cliente?.razon_social || "-"}</p>
            <p>Razón social: {cliente?.razon_social || "-"}</p>
            <p>RUT: {cliente?.rut || "-"}</p>
            <p>Tel: {cliente?.telefono || "-"}</p>
          </div>

          <div>
            <h3 className="font-bold mb-2">Vendedor</h3>
            <p>{pedido?.vendedor || "-"}</p>
            <p>Estado: {pedido?.estado || "-"}</p>
          </div>
        </section>

        <table className="w-full border-collapse text-sm mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Código</th>
              <th className="border p-2 text-left">Producto</th>
              <th className="border p-2 text-center">Cant.</th>
              <th className="border p-2 text-right">Precio</th>
              <th className="border p-2 text-right">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.codigo}</td>
                <td className="border p-2">{item.nombre}</td>
                <td className="border p-2 text-center">{item.cantidad}</td>
                <td className="border p-2 text-right">
                  {money(item.precio_unitario)}
                </td>
                <td className="border p-2 text-right">
                  {money(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-72 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong>{money(pedido?.subtotal)}</strong>
            </div>

            <div className="flex justify-between">
              <span>Descuento</span>
              <strong>- {money(pedido?.descuento_monto)}</strong>
            </div>

            <div className="flex justify-between text-xl border-t pt-2">
              <span>Total</span>
              <strong>{money(pedido?.total)}</strong>
            </div>
          </div>
        </div>

        {pedido?.observaciones && (
          <div className="mt-6 border-t pt-4 text-sm">
            <strong>Observaciones:</strong>
            <p>{pedido.observaciones}</p>
          </div>
        )}

        <div className="mt-8 print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            Imprimir / Mostrar cliente
          </button>
        </div>
      </div>
    </main>
  );
}