"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";

export default function WishlistButton({
  productId,
  initialWishlisted = false,
  className = "",
}: {
  productId: string;
  initialWishlisted?: boolean;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error("Something went wrong");
      return;
    }
    setWishlisted(data.wishlisted);
    toast.success(data.wishlisted ? "Added to wishlist" : "Removed from wishlist");
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label="Toggle wishlist"
      className={`h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:scale-105 transition ${className}`}
    >
      <Heart size={15} className={wishlisted ? "fill-red text-red" : "text-navy/60"} />
    </button>
  );
}
