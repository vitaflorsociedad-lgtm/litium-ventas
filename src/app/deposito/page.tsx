import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const money = (n?: number | null) => `USD ${Number(n || 0).toFixed(2)}`;

export default async function DepositoPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role !== "admin" && profile.role !== "deposito") {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      total,
      fecha,
      estado_deposito,
      clientes!pedidos_cliente_id_fkey (
        rut,
        razon_social,
        nombre_comercial
      )
    `)
    .eq("estado_deposito", "Pendiente de revisión")
    .order("id", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200">
            Error cargando pedidos: {error.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Depósito</h1>
            <p className="text-slate-300 mt-2">
              Pedidos pendientes de revisión y armado.
            </p>
          </div>

          <Link
            href="/deposito/finalizados"
            className="h-11 px-5 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold flex items-center hover:bg-white/10 transition"
          >
            Ver finalizados
          </Link>
        </div>

        {!pedidos || pedidos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            No hay pedidos pendientes.
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido: any) => {
              const cliente = Array.isArray(pedido.clientes)
                ? pedido.clientes[0]
                : pedido.clientes;

              const nombre =
                cliente?.nombre_comercial ||
                cliente?.razon_social ||
                cliente?.rut ||
                "Cliente sin nombre";

              return (
                <Link
                  key={pedido.id}
                  href={`/deposito/${pedido.id}`}
                  className="block rounded-3xl border border-white/10 bg-white/5 px-5 py-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">
                        {nombre}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        Pedido #{pedido.id} · {pedido.fecha}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-cyan-300 text-xl font-semibold">
                        {money(pedido.total)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
