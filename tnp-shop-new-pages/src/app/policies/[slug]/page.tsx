import { notFound } from "next/navigation";
import type { Metadata } from "next";

const POLICIES: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping & Delivery Policy",
    body: [
      "We deliver Pan India on all products.",
      "Once your customization is approved and payment is received, your order goes into production, quality check, and is then packed and shipped.",
      "You'll receive status updates by email as your order moves through production, quality check, packing and shipping.",
      "Delivery timelines vary by product and customization complexity — most orders ship within a few business days of approval.",
    ],
  },
  refund: {
    title: "Cancellation & Refund Policy",
    body: [
      "Since every order is custom-made specifically for you, cancellations are only possible before production begins (i.e. before your design is approved and moved to 'In Production').",
      "Once production has started, the order cannot be cancelled or refunded, as materials and printing have already been committed to your specific design.",
      "If you receive a damaged or incorrect item, contact us within 48 hours of delivery via WhatsApp (89230 32312) with photos, and we'll make it right — replacement or refund, assessed case by case.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect the information you provide at checkout (name, email, phone, shipping address) and any photos/text you upload for customization, solely to fulfil and deliver your order.",
      "Uploaded customization photos are stored securely and used only for producing your order — not shared with third parties beyond our printing/production process.",
      "Payment is processed by Razorpay; we do not store your card or bank details on our servers.",
      "For any privacy questions or data deletion requests, contact us via WhatsApp or email.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By placing an order with The Novelty Prints, you confirm that you have the right to use any photos, logos or content you upload for customization.",
      "All prices shown are starting prices and may vary based on final customization, quantity, size and packaging.",
      "All orders are prepaid — Cash on Delivery is not available for customized products.",
      "We reserve the right to decline any order that includes content that is unlawful, infringing, or otherwise inappropriate.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug];
  return { title: policy?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <div className="container-page py-10 md:py-16 max-w-2xl">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-navy mb-8">{policy.title}</h1>
      <div className="space-y-4">
        {policy.body.map((p, i) => (
          <p key={i} className="text-sm text-navy/70 leading-relaxed">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
