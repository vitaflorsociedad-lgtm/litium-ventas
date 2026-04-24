import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
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

  const puedeBorrarFinalizado =
    profile.role === "admin" ||
    (profile as any).can_delete_finalizado === true ||
    ["enrique", "kike"].includes(String(profile.nombre || "").toLowerCase());

  return (
    <DepositoDetalleClient
      pedidoId={pedidoId}
      puedeBorrarFinalizado={puedeBorrarFinalizado}
    />
  );
}