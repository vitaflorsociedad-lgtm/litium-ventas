import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import DepositoDetalleClient from "./DepositoDetalleClient";

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

  const supabase = await createClient();

  const { data: permiso } = await supabase
    .from("profiles")
    .select("role, can_delete_finalizado")
    .eq("id", user.id)
    .maybeSingle();

  const puedeBorrarFinalizado =
    permiso?.role === "admin" || permiso?.can_delete_finalizado === true;

  return (
    <DepositoDetalleClient
      pedidoId={pedidoId}
      puedeBorrarFinalizado={puedeBorrarFinalizado}
    />
  );
}