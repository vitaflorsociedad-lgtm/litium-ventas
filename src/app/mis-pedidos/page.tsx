import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

type ClientePedido = {
  razon_social: string | null;
  nombre_comercial: string | null;
};

type Pedido = {
  id: number;
  fecha: string;
  total: number | null;
  estado_deposito: string | null;
  clientes: ClientePedido | ClientePedido[] | null;
};

export default async function MisPedidosPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const supabase = await createClient();

  const nombreVendedor =
    profile.nombre?.trim() || profile.email?.trim() || "";

  const { data: activos, error: activosError } = await supabase
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
    .eq("vendedor", nombreVendedor)
    .eq("estado_deposito", "Pendiente de revisión")
    .order("id", { ascending: false });

  const { data: finalizados, error: finalizadosError } = await supabase
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
    .eq("vendedor", nombreVendedor)
    .eq("estado_deposito", "Pedido terminado")
    .order("id", { ascending: false });

  const mensajeError =
    activosError?.message || finalizadosError?.message || "";

  function nombreCliente(pedido: Pedido) {
    const c = Array.isArray(pedido.clientes)
      ? pedido.clientes[0]
      : pedido.clientes;

    return c?.nombre_comercial || c?.razon_social || "Cliente sin nombre";
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Mis pedidos</h1>
            <p className="text-slate-300 mt-2">
              Vendedor: {nombreVendedor || "—"}
            </p>
          </div>

          <Link
            href="/"
            className="h-11 px-5 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold flex items-center hover:bg-white/10 transition"
          >
            Volver al inicio
          </Link>
        </div>

        {mensajeError && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200">
            Error cargando pedidos: {mensajeError}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-3">Activos</h2>

          {!activos || activos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-400">
              No tienes pedidos activos.
            </div>
          ) : (
            <div className="space-y-3">
              {activos.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/deposito/${p.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {nombreCliente(p)}
                      </div>
                      <div className="text-sm text-slate-400">
                        Pedido #{p.id} · {p.fecha}
                      </div>
                    </div>

                    <div className="text-cyan-300 font-semibold shrink-0">
                      USD {Number(p.total || 0).toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 mt-6">Finalizados</h2>

          {!finalizados || finalizados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-400">
              No tienes pedidos finalizados.
            </div>
          ) : (
            <div className="space-y-3">
              {finalizados.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/deposito/${p.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {nombreCliente(p)}
                      </div>
                      <div className="text-sm text-slate-400">
                        Pedido #{p.id} · {p.fecha}
                      </div>
                    </div>

                    <div className="text-cyan-300 font-semibold shrink-0">
                      USD {Number(p.total || 0).toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
