import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  return NextResponse.json({ ok: true, ruta: "notificar-pedido activa" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pedidoId = body?.pedidoId;

    if (!pedidoId) {
      return NextResponse.json({ error: "Falta pedidoId" }, { status: 400 });
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        vendedor,
        estado,
        subtotal,
        descuento_porcentaje,
        descuento_monto,
        total,
        observaciones,
        estado_deposito,
        clientes!pedidos_cliente_id_fkey (
          rut,
          razon_social,
          nombre_comercial,
          telefono
        )
      `)
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: pedidoError?.message || "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("pedido_items")
      .select("codigo, nombre, cantidad, precio_unitario, subtotal")
      .eq("pedido_id", pedidoId)
      .order("id", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const cliente = Array.isArray((pedido as any).clientes)
      ? (pedido as any).clientes[0]
      : (pedido as any).clientes;

    const filas = (items || [])
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.codigo ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.nombre ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.cantidad ?? 0}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">USD ${Number(item.precio_unitario ?? 0).toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">USD ${Number(item.subtotal ?? 0).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;">
        <h2>Nuevo pedido enviado</h2>
        <p><strong>Pedido:</strong> #${pedido.id}</p>
        <p><strong>Fecha:</strong> ${pedido.fecha}</p>
        <p><strong>Vendedor:</strong> ${pedido.vendedor || "-"}</p>
        <p><strong>Estado:</strong> ${pedido.estado}</p>
        <p><strong>Estado depósito:</strong> ${pedido.estado_deposito || "Pendiente"}</p>

        <hr />

        <h3>Cliente</h3>
        <p><strong>RUT:</strong> ${cliente?.rut || "-"}</p>
        <p><strong>Nombre comercial:</strong> ${cliente?.nombre_comercial || "-"}</p>
        <p><strong>Razón social:</strong> ${cliente?.razon_social || "-"}</p>
        <p><strong>Teléfono:</strong> ${cliente?.telefono || "-"}</p>

        <hr />

        <h3>Detalle</h3>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Código</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Producto</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center;">Cant.</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">P. Unit.</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>

        <hr />

        <p><strong>Subtotal:</strong> USD ${Number((pedido as any).subtotal || 0).toFixed(2)}</p>
        <p><strong>Descuento:</strong> ${Number((pedido as any).descuento_porcentaje || 0).toFixed(2)}%</p>
        <p><strong>Monto descuento:</strong> USD ${Number((pedido as any).descuento_monto || 0).toFixed(2)}</p>
        <p><strong>Total final:</strong> USD ${Number((pedido as any).total || 0).toFixed(2)}</p>
        <p><strong>Observaciones:</strong> ${(pedido as any).observaciones || "-"}</p>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: process.env.PEDIDOS_FROM_EMAIL!,
      to: [process.env.PEDIDOS_TO_EMAIL!],
      subject: `Nuevo pedido #${pedido.id} - ${cliente?.nombre_comercial || cliente?.razon_social || "Cliente"}`,
      html,
    });

    if (emailError) {
      await supabase
        .from("pedidos")
        .update({
          email_enviado: false,
          email_destino: process.env.PEDIDOS_TO_EMAIL!,
          email_error: String(emailError.message || "Error enviando email"),
        })
        .eq("id", pedidoId);

      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    await supabase
      .from("pedidos")
      .update({
        email_enviado: true,
        email_destino: process.env.PEDIDOS_TO_EMAIL!,
        email_error: null,
      })
      .eq("id", pedidoId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
