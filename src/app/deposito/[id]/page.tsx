import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export default async function DepositoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role !== "admin" && profile.role !== "deposito") {
    redirect("/");
  }

  const { id } = await params;
  const pedidoId = Number(id);

  if (!pedidoId) {
    notFound();
  }

  const supabase = await createClient();

  const { data: pedido, error } = await supabase
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

  if (error || !pedido) {
    notFound();
  }

  const { data: items } = await supabase
    .from("pedido_items")
    .select("id, codigo, nombre, cantidad")
    .eq("pedido_id", pedidoId)
    .order("id", { ascending: true });

  const cliente = Array.isArray((pedido as any).clientes)
    ? (pedido as any).clientes[0]
    : (pedido as any).clientes;

  const esPendiente = (pedido as any).estado_deposito === "Pendiente de revisión";

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
              {cliente?.nombre_comercial || cliente?.razon_social || "Cliente"}
            </h1>

            <p className="text-slate-300 mt-2">
              Pedido #{(pedido as any).id}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {esPendiente && (
              <>
                <form action={finalizarPedidoAction}>
                  <input type="hidden" name="pedido_id" value={(pedido as any).id} />
                  <ConfirmSubmitButton
                    label="Finalizar pedido"
                    confirmText="¿Seguro que quieres finalizar este pedido?"
                    className="h-11 px-5 rounded-2xl bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 transition"
                  />
                </form>

                <form action={eliminarPedidoAction}>
                  <input type="hidden" name="pedido_id" value={(pedido as any).id} />
                  <ConfirmSubmitButton
                    label="Eliminar pedido"
                    confirmText="¿Seguro que quieres eliminar este pedido? Esta acción no se puede deshacer."
                    className="h-11 px-5 rounded-2xl bg-rose-500 text-white font-semibold hover:bg-rose-400 transition"
                  />
                </form>
              </>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            <MiniCard label="RUT" value={cliente?.rut || "-"} />
            <MiniCard label="Teléfono" value={cliente?.telefono || "-"} />
            <MiniCard label="Vendedor" value={(pedido as any).vendedor || "-"} />
            <MiniCard label="Fecha" value={(pedido as any).fecha || "-"} />
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
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 grid grid-cols-[100px_1fr_110px] gap-3 items-center"
                >
                  <div className="text-sm text-slate-400">{item.codigo}</div>
                  <div className="font-semibold">{item.nombre}</div>
                  <div className="text-center text-lg font-semibold text-cyan-300">
                    {item.cantidad}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pedido.observaciones && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold mb-2">Observaciones</h2>
            <p className="text-slate-300">{(pedido as any).observaciones}</p>
          </div>
        )}
      </div>
    </main>
  );
}

async function finalizarPedidoAction(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedido_id"));
  const supabase = await createClient();

  await supabase
    .from("pedidos")
    .update({ estado_deposito: "Pedido terminado" })
    .eq("id", pedidoId);

  redirect("/deposito");
}

async function eliminarPedidoAction(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedido_id"));
  const supabase = await createClient();

  await supabase.from("pedido_items").delete().eq("pedido_id", pedidoId);
  await supabase.from("pedidos").delete().eq("id", pedidoId);

  redirect("/deposito");
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
