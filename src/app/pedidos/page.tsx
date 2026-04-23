import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import PedidosClient from "./PedidosClient";

export default async function PedidosPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const vendedorActual =
    profile.nombre?.trim() ||
    profile.email?.trim() ||
    "";

  return <PedidosClient vendedorActual={vendedorActual} />;
}
