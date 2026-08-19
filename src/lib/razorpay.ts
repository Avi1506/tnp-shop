import "server-only";
import Razorpay from "razorpay";
import crypto from "crypto";

let client: Razorpay | null = null;

/** Lazily construct the Razorpay client so `next build` never fails just
 * because RAZORPAY_KEY_ID/SECRET aren't set yet in this environment. */
export function getRazorpay(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. Add them to .env.local (get free test keys at dashboard.razorpay.com)."
    );
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

/** Verify the signature Razorpay returns to the browser after checkout.
 * NEVER trust payment success from the client alone — this is the
 * server-side check that actually confirms the payment is real. */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
}

/** Verify a Razorpay webhook payload signature (X-Razorpay-Signature header). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
