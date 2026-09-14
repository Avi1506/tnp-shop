import "server-only";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CodSettings {
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  note?: string;
}

export const DEFAULT_COD_SETTINGS: CodSettings = {
  enabled: true,
  minAmount: 0,
  maxAmount: 10000,
  note: "Pay cash upon delivery. Please keep exact change ready.",
};

export async function getCodSettings(): Promise<CodSettings> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "cod_settings"))
      .limit(1);

    if (row?.value) {
      return { ...DEFAULT_COD_SETTINGS, ...(row.value as CodSettings) };
    }
  } catch (err) {
    console.error("[settings] Failed to fetch COD settings:", err);
  }
  return DEFAULT_COD_SETTINGS;
}

export async function updateCodSettings(settings: Partial<CodSettings>): Promise<CodSettings> {
  const current = await getCodSettings();
  const updated: CodSettings = { ...current, ...settings };

  await db
    .insert(siteSettings)
    .values({
      key: "cod_settings",
      value: updated,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: updated,
        updatedAt: new Date(),
      },
    });

  return updated;
}

export interface EmailTemplateItem {
  subject: string;
  body: string;
}

export interface EmailTemplates {
  welcome: EmailTemplateItem;
  orderConfirmed: EmailTemplateItem;
  orderShipped: EmailTemplateItem;
  orderDelivered: EmailTemplateItem;
  adminAlert: EmailTemplateItem;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  welcome: {
    subject: "Welcome to The Novelty Prints!",
    body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>
<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
  Welcome to <strong>The Novelty Prints</strong>! Your account has been created successfully.
</p>
<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
  You can now design custom corporate gifts, branded apparel, customized mugs, caps, and personalized stationery with live interactive previews!
</p>`,
  },
  orderConfirmed: {
    subject: "Your order {orderNumber} has been confirmed!",
    body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName}, thank you for your order!</p>
<p style="color:#3A3A3A;font-size:14px;">We have received your order <strong>{orderNumber}</strong> for total <strong>{total}</strong>.</p>
<p style="color:#3A3A3A;font-size:14px;">We'll review your customization and begin production shortly.</p>`,
  },
  orderShipped: {
    subject: "Your order {orderNumber} has been shipped! 🚀",
    body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>
<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
  Great news! Your customized order <strong>{orderNumber}</strong> has been carefully packed and handed over to our courier partner.
</p>`,
  },
  orderDelivered: {
    subject: "Your order {orderNumber} has been delivered! 🎉",
    body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>
<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
  Your order <strong>{orderNumber}</strong> has been marked as <strong>Delivered</strong>! We hope you love your customized prints.
</p>`,
  },
  adminAlert: {
    subject: "New Customized Order Received — {orderNumber}",
    body: `<p style="color:#3A3A3A;font-size:14px;">A new order <strong>{orderNumber}</strong> for <strong>{total}</strong> has been placed by {customerName} ({customerEmail}).</p>`,
  },
};

export async function getEmailTemplates(): Promise<EmailTemplates> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "email_templates"))
      .limit(1);

    if (row?.value) {
      return { ...DEFAULT_EMAIL_TEMPLATES, ...(row.value as Partial<EmailTemplates>) };
    }
  } catch (err) {
    console.error("[settings] Failed to fetch email templates:", err);
  }
  return DEFAULT_EMAIL_TEMPLATES;
}

export async function updateEmailTemplates(templates: Partial<EmailTemplates>): Promise<EmailTemplates> {
  const current = await getEmailTemplates();
  const updated: EmailTemplates = {
    welcome: { ...current.welcome, ...(templates.welcome || {}) },
    orderConfirmed: { ...current.orderConfirmed, ...(templates.orderConfirmed || {}) },
    orderShipped: { ...current.orderShipped, ...(templates.orderShipped || {}) },
    orderDelivered: { ...current.orderDelivered, ...(templates.orderDelivered || {}) },
    adminAlert: { ...current.adminAlert, ...(templates.adminAlert || {}) },
  };

  await db
    .insert(siteSettings)
    .values({
      key: "email_templates",
      value: updated,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: updated,
        updatedAt: new Date(),
      },
    });

  return updated;
}

export interface EmailSettings {
  emailFrom: string;
  adminEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  emailFrom: process.env.EMAIL_FROM || "The Novelty Prints <thenoveltyprints@gmail.com>",
  adminEmail: process.env.ADMIN_EMAIL || "thenoveltyprints@gmail.com",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
};

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "email_settings"))
      .limit(1);

    if (row?.value) {
      return { ...DEFAULT_EMAIL_SETTINGS, ...(row.value as Partial<EmailSettings>) };
    }
  } catch (err) {
    console.error("[settings] Failed to fetch email settings:", err);
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export async function updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const updated: EmailSettings = { ...current, ...settings };

  await db
    .insert(siteSettings)
    .values({
      key: "email_settings",
      value: updated,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: updated,
        updatedAt: new Date(),
      },
    });

  return updated;
}
