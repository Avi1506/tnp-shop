import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";

import { getEmailSettings } from "@/lib/settings";

async function getTransport() {
  const settings = await getEmailSettings();
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = settings.smtpPassword || process.env.SMTP_PASSWORD;
  const port = Number(settings.smtpPort || process.env.SMTP_PORT || 465);

  if (!host || !user || !pass) {
    return null;
  }
  return {
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    emailFrom: settings.emailFrom || process.env.EMAIL_FROM || "The Novelty Prints <thenoveltyprints@gmail.com>",
    adminEmail: settings.adminEmail || process.env.ADMIN_EMAIL || "thenoveltyprints@gmail.com",
  };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  event: string;
  orderId?: string;
}) {
  const config = await getTransport();
  try {
    if (!config) {
      // SMTP not configured yet — log instead of throwing, so the rest of
      // the checkout flow (order creation, payment) still succeeds.
      console.warn(`[email] SMTP not configured — skipped "${opts.subject}" to ${opts.to}`);
      await db.insert(emailLogs).values({
        to: opts.to,
        subject: opts.subject,
        event: opts.event,
        orderId: opts.orderId,
        status: "failed",
        error: "SMTP not configured (Add credentials in Admin Settings)",
      });
      return;
    }
    await config.transport.sendMail({
      from: config.emailFrom,
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

export function compileEmailTemplate(template: { subject: string; body: string }, vars: Record<string, string>) {
  let subject = template.subject;
  let body = template.body;

  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    subject = subject.replace(regex, val ?? "");
    body = body.replace(regex, val ?? "");
  }

  return {
    subject,
    html: shell(subject, body),
  };
}

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

export function welcomeCustomerEmail(params: { customerName: string; email: string }) {
  return shell(
    "Welcome to The Novelty Prints!",
    `<p style="color:#3A3A3A;font-size:14px;">Hi ${params.customerName},</p>
     <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
       Welcome to <strong>The Novelty Prints</strong>! Your account has been created successfully.
     </p>
     <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
       You can now design custom corporate gifts, branded apparel, customized mugs, caps, and personalized stationery with live interactive previews!
     </p>
     <div style="margin:24px 0;">
       <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://thenoveltyprints.com"}/shop" style="background:#B8912A;color:#1B2A4A;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;">
         Explore Our Collection →
       </a>
     </div>
     <p style="color:#8A8577;font-size:12px;margin-top:20px;">
       Need bulk customization for events or corporate gifting? Reply to this email or reach us on WhatsApp at <strong>89230 32312</strong>.
     </p>`
  );
}

export function orderShippedEmail(params: {
  orderNumber: string;
  customerName: string;
  trackingId?: string | null;
  trackingUrl?: string | null;
}) {
  return shell(
    "Your order has been shipped! 🚀",
    `<p style="color:#3A3A3A;font-size:14px;">Hi ${params.customerName},</p>
     <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
       Great news! Your customized order <strong>${params.orderNumber}</strong> has been carefully packed, quality-checked, and handed over to our courier partner.
     </p>
     <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#FAF9F6;border-radius:8px;padding:12px;">
       ${row("Order Number", params.orderNumber)}
       ${params.trackingId ? row("Tracking AWB / ID", params.trackingId) : ""}
       ${row("Status", "In Transit (Pan India Delivery)")}
     </table>
     ${
       params.trackingUrl
         ? `<div style="margin:24px 0;">
             <a href="${params.trackingUrl}" target="_blank" rel="noreferrer" style="background:#1B2A4A;color:#ffffff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:13px;">
               Track Courier Package →
             </a>
           </div>`
         : `<p style="color:#3A3A3A;font-size:13px;">
             You can also track your order anytime directly from 
             <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://thenoveltyprints.com"}/track-order" style="color:#B8912A;font-weight:600;">
               Track Order Page
             </a>.
           </p>`
     }
     <p style="color:#8A8577;font-size:12px;margin-top:20px;">
       If you have any questions regarding delivery, feel free to reply to this email or ping us on WhatsApp at 89230 32312.
     </p>`
  );
}

export function orderDeliveredEmail(params: {
  orderNumber: string;
  customerName: string;
}) {
  return shell(
    "Your order has been delivered! 🎉",
    `<p style="color:#3A3A3A;font-size:14px;">Hi ${params.customerName},</p>
     <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
       Your order <strong>${params.orderNumber}</strong> has been marked as <strong>Delivered</strong>! We hope you love your customized prints as much as we loved creating them for you.
     </p>
     <div style="background:#FAF9F6;border:1px solid #E9E4D8;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
       <p style="color:#1B2A4A;font-weight:600;font-size:14px;margin:0 0 6px;">How was your experience?</p>
       <p style="color:#8A8577;font-size:12px;margin:0;">
         Share your photos on Instagram and tag us <a href="https://instagram.com/thenoveltyprints" style="color:#B8912A;font-weight:600;">@thenoveltyprints</a> to get featured!
       </p>
     </div>
     <p style="color:#3A3A3A;font-size:13px;margin-top:20px;">
       Thank you for choosing The Novelty Prints!
     </p>`
  );
}

