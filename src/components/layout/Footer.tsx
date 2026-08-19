import Link from "next/link";
import { MessageCircle, MapPin } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All Products" },
      { href: "/shop?category=tshirts-apparel", label: "T-Shirts & Apparel" },
      { href: "/shop?category=mugs-drinkware", label: "Mugs & Drinkware" },
      { href: "/shop?category=cushions-couple-gifts", label: "Cushions & Couple Gifts" },
      { href: "/bulk-enquiry", label: "Bulk & Corporate Gifting" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/track-order", label: "Track Order" },
      { href: "/policies/shipping", label: "Shipping & Delivery" },
      { href: "/policies/refund", label: "Cancellation & Refund" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/policies/privacy", label: "Privacy Policy" },
      { href: "/policies/terms", label: "Terms & Conditions" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-20">
      <div className="container-page py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-display text-xl font-semibold mb-2">The Novelty Prints</h3>
          <p className="text-white/60 text-sm leading-relaxed mb-4">Made personal. Made memorable.</p>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <a href="https://wa.me/918923032312" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-gold">
              <MessageCircle size={16} /> 89230 32312
            </a>
            <a href="https://instagram.com/thenoveltyprints" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-gold">
              <InstagramIcon size={16} /> @thenoveltyprints
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={16} /> Greater Noida West · Pan India Delivery
            </span>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs tracking-wider uppercase text-gold font-semibold mb-4">{col.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/70 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} The Novelty Prints. All rights reserved.
      </div>
    </footer>
  );
}
