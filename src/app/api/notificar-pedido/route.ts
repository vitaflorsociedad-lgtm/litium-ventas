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

    // 1. Traer pedido + cliente
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
        clientes (
          razon_social,
          nombre_comercial,
          rut,
          telefono
        )
      `)
      .eq("id", pedidoId)
      .single();

    if (pedidoError) {
      return NextResponse.json({ error: pedidoError.message }, { status: 500 });
    }

    // 2. Traer items
    const { data: items, error: itemsError } = await supabase
      .from("pedido_items")
      .select("codigo, nombre, cantidad, precio_unitario, subtotal")
      .eq("pedido_id", pedidoId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const cliente =
      pedido.clientes?.nombre_comercial ||
      pedido.clientes?.razon_social ||
      pedido.clientes?.rut ||
      "Cliente";

    // ============================
    // 📧 EMAIL ADMIN (CON PRECIOS)
    // ============================

    const itemsAdminHTML = items
      .map(
        (item: any) => `
        <tr>
          <td style="padding:6px 10px;">${item.codigo}</td>
          <td style="padding:6px 10px;">${item.nombre}</td>
          <td style="padding:6px 10px; text-align:center;">${item.cantidad}</td>
          <td style="padding:6px 10px;">USD ${item.precio_unitario}</td>
          <td style="padding:6px 10px;">USD ${item.subtotal}</td>
        </tr>
      `
      )
      .join("");

    const htmlAdmin = `
      <h2>Nuevo Pedido</h2>
      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Vendedor:</strong> ${pedido.vendedor}</p>
      <p><strong>Fecha:</strong> ${pedido.fecha}</p>

      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsAdminHTML}
        </tbody>
      </table>

      <p><strong>Subtotal:</strong> USD ${pedido.subtotal}</p>
      <p><strong>Descuento:</strong> ${pedido.descuento_porcentaje}%</p>
      <p><strong>Total:</strong> USD ${pedido.total}</p>

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

    // ============================
    // 📧 EMAIL DEPÓSITO (SIN PRECIOS)
    // ============================

    const itemsDepositoHTML = items
      .map(
        (item: any) => `
        <tr>
          <td style="padding:8px 10px;">${item.codigo}</td>
          <td style="padding:8px 10px;">${item.nombre}</td>
          <td style="padding:8px 10px; text-align:center; font-weight:bold;">${item.cantidad}</td>
        </tr>
      `
      )
      .join("");

    const htmlDeposito = `
      <h2>🚨 NUEVO PEDIDO</h2>

      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Vendedor:</strong> ${pedido.vendedor}</p>

      <br/>

      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Cantidad</th>
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
      from: "Depósito <onboarding@resend.dev>",
      to: ["litiumdeposito@gmail.com"],
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