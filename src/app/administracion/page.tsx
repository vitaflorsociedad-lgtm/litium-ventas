import Link from "next/link";
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

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      total,
      fecha,
      estado_deposito,
      clientes!pedidos_cliente_id_fkey (
        razon_social,
        nombre_com
