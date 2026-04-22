import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const money = (n?: number | null) => `USD ${Number(n || 0).toFixed(2)}`;

export default async function AdministracionPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: pedidos } = await supabase
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
    .eq("estado_deposito", "Pedido terminado")
    .order("id", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Administración</h1>
          <p className="text-slate-300 mt-2">
            Pedidos terminados listos para facturación.
          </p>
        </div>

        {!pedidos || pedidos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            No hay pedidos terminados.
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
                "Cliente sin nombre";

              return (
                <div
                  key={pedido.id}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4"
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
                      <div className="text-sm text-emerald-300">
                        Listo para facturar
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
