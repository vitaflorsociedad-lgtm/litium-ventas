import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const isAdmin = profile.role === "admin";
  const isVentas = profile.role === "ventas";
  const isDeposito = profile.role === "deposito";

  if (isDeposito) {
    redirect("/deposito");
  }

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LogoutButton />
      </div>

      <div className="absolute inset-0">
        <Image
          src="/logo-litium.jpg"
          alt="Litium Italy Designed"
          fill
          priority
          className="object-contain scale-[1.05] opacity-95"
        />
      </div>

      <div className="absolute inset-0 bg-black/10" />

      <div className="relative z-10 min-h-screen flex items-end justify-center px-6 pb-14 sm:pb-16 md:pb-20">
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(isAdmin || isVentas) && (
              <Link
                href="/clientes"
                className="rounded-[28px] bg-white text-black text-center font-semibold text-lg md:text-xl py-5 shadow-[0_10px_40px_rgba(255,255,255,0.12)] transition duration-300 hover:scale-[1.02] hover:bg-zinc-200"
              >
                Clientes
              </Link>
            )}

            {(isAdmin || isVentas) && (
              <Link
                href="/pedidos"
                className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur text-white text-center font-semibold text-lg md:text-xl py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:scale-[1.02] hover:bg-white/15"
              >
                Pedidos
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/deposito"
                className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur text-white text-center font-semibold text-lg md:text-xl py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:scale-[1.02] hover:bg-white/15"
              >
                Depósito
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}