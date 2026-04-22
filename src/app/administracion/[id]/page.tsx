import { redirect, notFound } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const money = (n?: number | null) => `USD ${Number(n || 0).toFixed(2)}`;

export default async function AdministracionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const pedidoId = Number(id);

  if (!pedidoId) notFound();

  const supabase = await createClient();

  const { data: pedido, error } = await supabase
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
    .eq("id", pedidoId)
    .single();

  if (error || !pedido) notFound();

  const { data: items } = await supabase
    .from("pedido_items")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("id", { ascending: true });

  const cliente = Array.isArray((pedido as any).clientes)
    ? (pedido as any).clientes[0]
    : (pedido as any).clientes;

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <a
            href="/administracion"
            className="text-cyan-300 text-sm hover:underline"
          >
            ← Volver a administración
          </a>
          <h1 className="text-3xl font-semibold mt-3">
            {cliente?.nombre_comercial || cliente?.razon_social || "Cliente"}
          </h1>
          <p className="text-slate-300 mt-2">
            Pedido #{pedido.id}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            <MiniCard label="RUT" value={cliente?.rut || "-"} />
            <MiniCard label="Teléfono" value={cliente?.telefono || "-"} />
            <MiniCard label="Vendedor" value={pedido.vendedor || "-"} />
            <MiniCard label="Fecha" value={pedido.fecha || "-"} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold mb-4">Productos</h2>

          {!items || items.length === 0 ? (
            <div className="text-slate-400">Este pedido no tiene items.</div>
          ) : (
            <div className="space-y-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 grid md:grid-cols-[100px_1fr_100px_120px_120px] gap-3 items-center"
                >
                  <div className="text-sm text-slate-400">{item.codigo}</div>
                  <div className="font-semibold">{item.nombre}</div>
                  <div className="text-center">{item.cantidad}</div>
                  <div className="text-right">{money(item.precio_unitario)}</div>
                  <div className="text-right text-cyan-300 font-semibold">
                    {money(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="max-w-sm ml-auto space-y-2">
            <Row label="Subtotal" value={money((pedido as any).subtotal)} />
            <Row
              label="Descuento"
              value={`${Number((pedido as any).descuento_porcentaje || 0).toFixed(2)}%`}
            />
            <Row
              label="Monto descuento"
              value={`- ${money((pedido as any).descuento_monto)}`}
            />
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-lg font-semibold">
              <span>Total</span>
              <span className="text-cyan-300">{money((pedido as any).total)}</span>
            </div>
          </div>
        </div>

        {pedido.observaciones && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold mb-2">Observaciones</h2>
            <p className="text-slate-300">{pedido.observaciones}</p>
          </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
