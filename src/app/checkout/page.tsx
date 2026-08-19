"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartContext";
import { formatINR } from "@/lib/format";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other",
];

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    fullName: session?.user?.name ?? "",
    phone: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "Uttar Pradesh",
    pincode: "",
  });
  const [note, setNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            customization: l.customization,
          })),
          address,
          customerNote: note,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create order");

      // --- COD HANDLER ---
      if (data.isCod) {
        clear();
        toast.success("Order placed successfully with Cash on Delivery!");
        router.push(`/order/${data.orderNumber}/confirmation`);
        return;
      }

      // --- ONLINE PAYMENT (RAZORPAY) HANDLER ---
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "The Novelty Prints",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.customerName,
          email: data.customerEmail,
          contact: data.customerPhone,
        },
        theme: { color: "#1B2A4A" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderId, ...response }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            toast.error(verifyData.error || "Payment verification failed. Contact us if you were charged.");
            return;
          }
          clear();
          router.push(`/order/${verifyData.orderNumber}/confirmation`);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-navy/60">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="container-page py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-semibold text-navy mb-8">Checkout</h1>
        <div className="grid md:grid-cols-[1fr_360px] gap-10">
          <form onSubmit={handlePay} className="space-y-5">
            <h2 className="font-semibold text-navy">Shipping Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                placeholder="Full Name"
                value={address.fullName}
                onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
                className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <input
                required
                placeholder="Mobile Number"
                value={address.phone}
                onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <input
                required
                placeholder="House / Flat, Street, Area"
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <input
                placeholder="Landmark (optional)"
                value={address.landmark}
                onChange={(e) => setAddress((a) => ({ ...a, landmark: e.target.value }))}
                className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <input
                required
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                className="text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <select
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                className="text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="PIN Code"
                value={address.pincode}
                onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
            </div>

            <textarea
              placeholder="Order note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />

            <div className="space-y-3">
              <h2 className="font-semibold text-navy">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setPaymentMethod("online")}
                  className={`p-4 border rounded-xl cursor-pointer transition flex flex-col gap-1 ${
                    paymentMethod === "online"
                      ? "border-navy bg-navy/5 ring-1 ring-navy"
                      : "border-border hover:border-navy/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-navy">Online Payment</span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                      className="accent-navy"
                    />
                  </div>
                  <span className="text-xs text-navy/60">UPI, Credit/Debit Cards, Netbanking</span>
                </label>

                <label
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 border rounded-xl cursor-pointer transition flex flex-col gap-1 ${
                    paymentMethod === "cod"
                      ? "border-navy bg-navy/5 ring-1 ring-navy"
                      : "border-border hover:border-navy/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-navy">Cash on Delivery</span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="accent-navy"
                    />
                  </div>
                  <span className="text-xs text-navy/60">Pay cash upon delivery</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-navy-dark font-semibold py-3.5 rounded-full hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {paymentMethod === "cod"
                ? `Place COD Order (${formatINR(subtotal)})`
                : `Pay ${formatINR(subtotal)} Securely`}
            </button>
          </form>

          <div className="border border-border rounded-2xl p-6 h-fit">
            <h2 className="font-semibold text-navy mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {lines.map((l) => (
                <div key={l.lineId} className="flex justify-between text-sm">
                  <span className="text-navy/70">
                    {l.name} × {l.quantity}
                  </span>
                  <span className="font-medium text-navy">{formatINR(l.unitPrice * l.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 flex justify-between font-semibold text-navy">
              <span>Total</span>
              <span>{formatINR(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
