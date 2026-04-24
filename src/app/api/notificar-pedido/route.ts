import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { pedidoId } = await req.json();

    if (!pedidoId) {
      return NextResponse.json({ error: "Falta pedidoId" }, { status: 400 });
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        vendedor,
        subtotal,
        descuento_porcentaje,
        descuento_monto,
        total,
        observaciones,
        clientes!pedidos_cliente_id_fkey (
          razon_social,
          nombre_comercial,
          rut,
          telefono
        )
      `)
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: pedidoError?.message || "No se encontró el pedido" },
        { status: 500 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("pedido_items")
      .select("codigo, nombre, cantidad, precio_unitario, subtotal")
      .eq("pedido_id", pedidoId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const clienteData = Array.isArray((pedido as any).clientes)
      ? (pedido as any).clientes[0]
      : (pedido as any).clientes;

    const cliente =
      clienteData?.nombre_comercial ||
      clienteData?.razon_social ||
      clienteData?.rut ||
      "Cliente";

    const itemsAdminHTML = (items || [])
      .map(
        (item: any) => `
          <tr>
            <td style="padding:6px 10px;">${item.codigo || ""}</td>
            <td style="padding:6px 10px;">${item.nombre || ""}</td>
            <td style="padding:6px 10px; text-align:center;">${item.cantidad || 0}</td>
            <td style="padding:6px 10px;">USD ${Number(item.precio_unitario || 0).toFixed(2)}</td>
            <td style="padding:6px 10px;">USD ${Number(item.subtotal || 0).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const htmlAdmin = `
      <h2>Nuevo pedido</h2>

      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>RUT:</strong> ${clienteData?.rut || "-"}</p>
      <p><strong>Teléfono:</strong> ${clienteData?.telefono || "-"}</p>
      <p><strong>Vendedor:</strong> ${pedido.vendedor || "-"}</p>
      <p><strong>Fecha:</strong> ${pedido.fecha || "-"}</p>

      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:6px 10px;">Código</th>
            <th style="padding:6px 10px;">Producto</th>
            <th style="padding:6px 10px;">Cantidad</th>
            <th style="padding:6px 10px;">Precio</th>
            <th style="padding:6px 10px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsAdminHTML}
        </tbody>
      </table>

      <p><strong>Subtotal:</strong> USD ${Number(pedido.subtotal || 0).toFixed(2)}</p>
      <p><strong>Descuento:</strong> ${Number(pedido.descuento_porcentaje || 0)}%</p>
      <p><strong>Monto descuento:</strong> USD ${Number(pedido.descuento_monto || 0).toFixed(2)}</p>
      <p><strong>Total:</strong> USD ${Number(pedido.total || 0).toFixed(2)}</p>

      ${
        pedido.observaciones
          ? `<p><strong>Observaciones:</strong> ${pedido.observaciones}</p>`
          : ""
      }
    `;

    const itemsDepositoHTML = (items || [])
      .map(
        (item: any) => `
          <tr>
            <td style="padding:8px 10px;">${item.codigo || ""}</td>
            <td style="padding:8px 10px;">${item.nombre || ""}</td>
            <td style="padding:8px 10px; text-align:center; font-weight:bold;">${item.cantidad || 0}</td>
          </tr>
        `
      )
      .join("");

    const htmlDeposito = `
      <h2>🚨 NUEVO PEDIDO</h2>

      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>RUT:</strong> ${clienteData?.rut || "-"}</p>
      <p><strong>Teléfono:</strong> ${clienteData?.telefono || "-"}</p>
      <p><strong>Vendedor:</strong> ${pedido.vendedor || "-"}</p>

      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px 10px;">Código</th>
            <th style="padding:8px 10px;">Producto</th>
            <th style="padding:8px 10px;">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${itemsDepositoHTML}
        </tbody>
      </table>

      ${
        pedido.observaciones
          ? `<p><strong>Observaciones:</strong> ${pedido.observaciones}</p>`
          : ""
      }
    `;

    await resend.emails.send({
      from: "Pedidos <onboarding@resend.dev>",
      to: ["vitaflorsociedad@gmail.com"],
      subject: `Nuevo pedido - ${cliente}`,
      html: htmlAdmin,
    });

    await resend.emails.send({
      from: "Depósito <onboarding@resend.dev>",
      to: ["vitaflorsociedad@gmail.com"],
      subject: `🚨 NUEVO PEDIDO - ${cliente}`,
      html: htmlDeposito,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error desconocido" },
      { status: 500 }
    );
  }
}