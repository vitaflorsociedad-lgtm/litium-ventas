import { supabase } from "@/lib/supabase";

export default async function PedidoVista({ params }: any) {
  const pedidoId = params.id;

  // PEDIDO
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .single();

  // CLIENTE
  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", pedido.cliente_id)
    .single();

  // ITEMS
  const { data: items } = await supabase
    .from("pedido_items")
    .select("*")
    .eq("pedido_id", pedidoId);

  return (
    <main className="bg-white text-black min-h-screen p-6">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-2xl font-bold mb-4">Presupuesto</h1>

        {/* DATOS */}
        <div className="mb-6">
          <div><b>Cliente:</b> {cliente.nombre_comercial || cliente.razon_social}</div>
          <div><b>RUT:</b> {cliente.rut}</div>
          <div><b>Teléfono:</b> {cliente.telefono}</div>
          <div><b>Fecha:</b> {pedido.fecha}</div>
          <div><b>Vendedor:</b> {pedido.vendedor}</div>
        </div>

        {/* TABLA */}
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Producto</th>
              <th className="p-2 border">Cant</th>
              <th className="p-2 border">Precio</th>
              <th className="p-2 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item: any) => (
              <tr key={item.id}>
                <td className="p-2 border">{item.codigo}</td>
                <td className="p-2 border">{item.nombre}</td>
                <td className="p-2 border text-center">{item.cantidad}</td>
                <td className="p-2 border text-right">
                  USD {item.precio_unitario.toFixed(2)}
                </td>
                <td className="p-2 border text-right">
                  USD {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div className="mt-6 text-right space-y-1">
          <div>Subtotal: USD {pedido.subtotal.toFixed(2)}</div>
          <div>Descuento: -USD {pedido.descuento_monto.toFixed(2)}</div>
          <div className="text-xl font-bold">
            Total: USD {pedido.total.toFixed(2)}
          </div>
        </div>

        {/* OBSERVACIONES */}
        {pedido.observaciones && (
          <div className="mt-6">
            <b>Observaciones:</b>
            <p>{pedido.observaciones}</p>
          </div>
        )}

        {/* BOTÓN IMPRIMIR */}
        <div className="mt-8">
          <button
            onClick={() => window.print()}
            className="bg-black text-white px-6 py-3 rounded-lg"
          >
            Imprimir / Mostrar cliente
          </button>
        </div>

      </div>
    </main>
  );
}