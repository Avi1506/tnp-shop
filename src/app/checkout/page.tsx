"use client";

import { useState, useEffect } from "react";
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

export type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function CheckoutPage() {
  const { lines, subtotal, clear, updateQuantity } = useCart();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

  const [codConfig, setCodConfig] = useState<{
    enabled: boolean;
    minAmount?: number;
    maxAmount?: number;
    note?: string;
  }>({ enabled: true });

  const [address, setAddress] = useState({
    fullName: "",
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

  // Fetch store settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.cod) {
          setCodConfig(d.cod);
          if (!d.cod.enabled) {
            setPaymentMethod("online");
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch saved addresses and pre-populate
  useEffect(() => {
    if (session?.user) {
      fetch("/api/account/addresses")
        .then((r) => r.json())
        .then((d) => {
          const list: SavedAddress[] = d.addresses ?? [];
          setSavedAddresses(list);

          if (list.length > 0) {
            // Pick default address or first address
            const def = list.find((a) => a.isDefault) || list[0];
            setSelectedAddressId(def.id);
            setAddress({
              fullName: def.fullName || session.user.name || "",
              phone: def.phone || session.user.phone || "",
              line1: def.line1 || "",
              line2: def.line2 || "",
              landmark: def.landmark || "",
              city: def.city || "",
              state: def.state || "Uttar Pradesh",
              pincode: def.pincode || "",
            });
          } else {
            setSelectedAddressId("new");
            setAddress((prev) => ({
              ...prev,
              fullName: session.user.name || prev.fullName,
              phone: session.user.phone || prev.phone,
            }));
          }
        })
        .catch(() => {});
    }
  }, [session]);

  function handleSelectSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      landmark: addr.landmark || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    });
  }

  function handleSelectNewAddress() {
    setSelectedAddressId("new");
    setAddress({
      fullName: session?.user?.name || "",
      phone: session?.user?.phone || "",
      line1: "",
      line2: "",
      landmark: "",
      city: "",
      state: "Uttar Pradesh",
      pincode: "",
    });
  }

  const isCodEligible =
    codConfig.enabled &&
    (!codConfig.minAmount || subtotal >= codConfig.minAmount) &&
    (!codConfig.maxAmount || subtotal <= codConfig.maxAmount);

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

        <ol aria-label="Checkout progress" className="mb-8 grid grid-cols-3 gap-2">
          {["Review & customize", "Shipping", "Payment"].map((label, index) => {
            const step = (index + 1) as 1 | 2 | 3;
            return <li key={label} aria-current={checkoutStep === step ? "step" : undefined} className={`rounded-xl border p-3 text-center text-xs sm:text-sm font-semibold ${checkoutStep === step ? "border-gold bg-gold/10 text-navy" : "border-border text-navy/55"}`}>
              <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">{step}</span>{label}
            </li>;
          })}
        </ol>

        {!session?.user && authStatus !== "loading" && (
          <div className="mb-8 p-4 bg-offwhite border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy">Already have an account?</p>
              <p className="text-xs text-navy/60">Log in with your phone or email to use saved addresses and fast checkout.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`)}
              className="bg-navy text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-navy-dark transition shrink-0"
            >
              Log In
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_360px] gap-10">
          <form onSubmit={handlePay} className="space-y-6">
            {checkoutStep === 1 && <section aria-labelledby="checkout-review-title" className="space-y-4">
              <h2 id="checkout-review-title" className="font-semibold text-navy text-lg">Step 1: Product customization &amp; quantity</h2>
              <p className="text-sm text-navy/60">Review each item and its personalization before entering delivery details.</p>
              {lines.map((line) => <article key={line.lineId} className="flex gap-4 rounded-xl border border-border p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-offwhite">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.customization?.previewImage || line.image} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-navy">{line.name}</h3>
                  {line.customization && <p className="mt-1 text-xs text-navy/60">Personalized{line.customization.text ? ` · ${line.customization.text}` : ""}{line.customization.specialInstructions ? ` · ${line.customization.specialInstructions}` : ""}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-navy">Quantity
                    <input aria-label={`${line.name} quantity`} type="number" min={1} max={50} value={line.quantity} onChange={(event) => updateQuantity(line.lineId, Math.min(50, Math.max(1, Number(event.target.value) || 1)))} className="w-20 rounded-lg border control-border px-2 py-2" />
                    </label>
                    <strong className="text-sm text-navy">{formatINR(line.unitPrice * line.quantity)}</strong>
                  </div>
                </div>
              </article>)}
              <div className="flex justify-end border-t border-border pt-4 text-base font-bold text-navy">Subtotal: {formatINR(subtotal)}</div>
              <button type="button" onClick={() => setCheckoutStep(2)} className="w-full btn-primary-cta rounded-full py-3.5 font-semibold touch-target-48 btn-cta-mobile">Continue to Shipping</button>
            </section>}

            {checkoutStep === 2 && <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-navy text-lg">Step 2: Shipping &amp; delivery</h2>
                {session?.user && (
                  <span className="text-xs text-navy/50">{session.user.email}</span>
                )}
              </div>

              {/* Saved Address Selection Cards */}
              {session?.user && savedAddresses.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                    Select a Saved Address or Add New:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                            isSelected
                              ? "border-navy bg-navy/5 ring-1 ring-navy shadow-xs"
                              : "border-border bg-white hover:border-navy/40"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="savedAddress"
                                  checked={isSelected}
                                  onChange={() => handleSelectSavedAddress(addr)}
                                  className="accent-navy"
                                />
                                {addr.label || "Address"}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] bg-gold/15 text-navy-dark px-2 py-0.5 rounded-full font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-navy">{addr.fullName} · {addr.phone}</p>
                            <p className="text-xs text-navy/70 mt-1 line-clamp-2">
                              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.pincode}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      onClick={handleSelectNewAddress}
                      className={`p-3.5 rounded-xl border border-dashed cursor-pointer transition flex items-center justify-center gap-2 ${
                        selectedAddressId === "new"
                          ? "border-navy bg-navy/5 ring-1 ring-navy shadow-xs"
                          : "border-border bg-white hover:border-navy/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === "new"}
                        onChange={handleSelectNewAddress}
                        className="accent-navy"
                      />
                      <span className="text-xs font-semibold text-navy">+ Deliver to a New Address</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Address Form Fields */}
              <div className="pt-2">
                <p className="text-xs font-medium text-navy/50 mb-3">
                  {selectedAddressId === "new"
                    ? "Enter shipping address details (will be saved for future orders):"
                    : "Address details (you can edit any field below for this order):"}
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <input
                    required
                    placeholder="Full Name"
                    value={address.fullName}
                    onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
                    className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Mobile Number"
                    value={address.phone}
                    onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                    className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    required
                    placeholder="House / Flat, Street, Area"
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    className="col-span-2 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    placeholder="Landmark / Area (optional)"
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
              </div>
            </div>

            <textarea
              placeholder="Order note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />

            <div className="flex gap-3">
              <button type="button" onClick={() => setCheckoutStep(1)} className="min-h-12 flex-1 rounded-full border control-border px-6 py-3.5 font-semibold text-navy">Back</button>
              <button type="button" onClick={() => {
                if (![address.fullName, address.phone, address.line1, address.city, address.pincode].every((value) => value.trim())) {
                  toast.error("Please complete the required shipping details.");
                  return;
                }
                setCheckoutStep(3);
              }} className="flex-1 btn-primary-cta rounded-full py-3.5 font-semibold touch-target-48 btn-cta-mobile">Continue to Payment</button>
            </div>
            </>}

            {checkoutStep === 3 && <>
            <h2 className="font-semibold text-navy text-lg">Step 3: Payment &amp; order confirmation</h2>
            <div className="rounded-xl bg-offwhite p-4 text-sm text-navy">
              <p className="font-semibold">Delivering to {address.fullName}</p>
              <p className="mt-1 text-xs text-navy/70">{address.line1}, {address.city}, {address.state} {address.pincode} · {address.phone}</p>
            </div>
            <div className="space-y-3">
              <h2 className="font-semibold text-navy">Payment Method</h2>
              <div className={`grid grid-cols-1 ${codConfig.enabled ? "sm:grid-cols-2" : ""} gap-3`}>
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

                {codConfig.enabled && (
                  <label
                    onClick={() => {
                      if (isCodEligible) setPaymentMethod("cod");
                    }}
                    className={`p-4 border rounded-xl transition flex flex-col gap-1 ${
                      !isCodEligible
                        ? "opacity-50 cursor-not-allowed border-border bg-gray-50"
                        : paymentMethod === "cod"
                        ? "border-navy bg-navy/5 ring-1 ring-navy cursor-pointer"
                        : "border-border hover:border-navy/40 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-navy">Cash on Delivery</span>
                      <input
                        type="radio"
                        name="paymentMethod"
                        disabled={!isCodEligible}
                        checked={paymentMethod === "cod"}
                        onChange={() => {
                          if (isCodEligible) setPaymentMethod("cod");
                        }}
                        className="accent-navy"
                      />
                    </div>
                    <span className="text-xs text-navy/60">
                      {isCodEligible
                        ? codConfig.note || "Pay cash upon delivery"
                        : codConfig.minAmount && subtotal < codConfig.minAmount
                        ? `Available for orders above ₹${codConfig.minAmount}`
                        : `Available for orders up to ₹${codConfig.maxAmount}`}
                    </span>
                  </label>
                )}
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
            <button type="button" onClick={() => setCheckoutStep(2)} className="w-full min-h-12 rounded-full border control-border px-6 py-3 font-semibold text-navy">Back to Shipping</button>
            </>}
          </form>

          {checkoutStep !== 1 && <div className="border border-border rounded-2xl p-6 h-fit">
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
          </div>}
        </div>
      </div>
    </>
  );
}
