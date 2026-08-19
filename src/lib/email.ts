import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  event: string;
  orderId?: string;
}) {
  const transport = getTransport();
  try {
    if (!transport) {
      // SMTP not configured yet — log instead of throwing, so the rest of
      // the checkout flow (order creation, payment) still succeeds.
      console.warn(`[email] SMTP not configured — skipped "${opts.subject}" to ${opts.to}`);
      await db.insert(emailLogs).values({
        to: opts.to,
        subject: opts.subject,
        event: opts.event,
        orderId: opts.orderId,
        status: "failed",
        error: "SMTP not configured",
      });
      return;
    }
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? "The Novelty Prints <orders@thenoveltyprints.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    await db.insert(emailLogs).values({
      to: opts.to,
      subject: opts.subject,
      event: opts.event,
      orderId: opts.orderId,
      status: "sent",
    });
  } catch (err) {
    console.error("[email] send failed", err);
    await db.insert(emailLogs).values({
      to: opts.to,
      subject: opts.subject,
      event: opts.event,
      orderId: opts.orderId,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Branded HTML shell
// ---------------------------------------------------------------------------
function shell(title: string, bodyHtml: string) {
  return `
  <div style="font-family:Poppins,Arial,sans-serif;background:#FAF9F6;padding:32px 0;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E9E4D8;">
      <div style="background:#1B2A4A;padding:24px 32px;">
        <span style="color:#B8912A;font-size:12px;letter-spacing:2px;font-weight:600;">THE NOVELTY PRINTS</span>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:20px;color:#1B2A4A;margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;background:#FAF9F6;color:#8A8577;font-size:12px;">
        The Novelty Prints · Greater Noida West · Pan India Delivery<br/>
        WhatsApp: 89230 32312 · @thenoveltyprints
      </div>
    </div>
  </div>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:4px 0;color:#8A8577;font-size:13px;width:140px;">${label}</td><td style="padding:4px 0;color:#1B2A4A;font-size:13px;font-weight:600;">${value}</td></tr>`;

export function customerOrderConfirmedEmail(params: {
  orderNumber: string;
  customerName: string;
  total: string;
  itemsHtml: string;
}) {
  return shell(
    "Your order has been confirmed.",
    `<p style="color:#3A3A3A;font-size:14px;">Hi ${params.customerName}, thank you for your order! Here's a summary:</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;">
       ${row("Order Number", params.orderNumber)}
       ${row("Order Total", params.total)}
     </table>
     ${params.itemsHtml}
     <p style="color:#3A3A3A;font-size:14px;margin-top:20px;">
       We'll review your customization and begin production shortly. You can track your order anytime from
       <a href="${process.env.NEXT_PUBLIC_SITE_URL}/account/orders" style="color:#B8912A;">My Orders</a>.
     </p>`
  );
}

export function adminNewOrderEmail(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  total: string;
  itemsHtml: string;
}) {
  return shell(
    "New Customized Order Received",
    `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
       ${row("Order Number", params.orderNumber)}
       ${row("Customer", params.customerName)}
       ${row("Phone", params.customerPhone)}
       ${row("Email", params.customerEmail)}
       ${row("Shipping Address", params.address)}
       ${row("Order Total", params.total)}
     </table>
     ${params.itemsHtml}
     <p style="margin-top:16px;">
       <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders" style="background:#1B2A4A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;">
         View in Admin Dashboard
       </a>
     </p>`
  );
}

export function orderStatusUpdateEmail(params: { orderNumber: string; status: string; customerName: string }) {
  const STATUS_LABEL: Record<string, string> = {
    payment_received: "Payment received — your order is confirmed.",
    design_review: "We're reviewing your design.",
    in_production: "Your order is now in production.",
    quality_check: "Your order is going through quality check.",
    packed: "Your order has been packed.",
    shipped: "Your order has shipped!",
    delivered: "Your order has been delivered.",
    cancelled: "Your order has been cancelled.",
    refunded: "Your refund has been processed.",
  };
  return shell(
    STATUS_LABEL[params.status] ?? "Your order status has been updated.",
    `<p style="color:#3A3A3A;font-size:14px;">Hi ${params.customerName}, an update on order <strong>${params.orderNumber}</strong>:</p>
     <p style="color:#1B2A4A;font-size:15px;font-weight:600;">${STATUS_LABEL[params.status] ?? params.status}</p>`
  );
}
