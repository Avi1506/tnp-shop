import Image from "next/image";

export const metadata = { title: "About Us" };

const badges = ["PERSONALISED", "CREATIVE", "CUSTOM", "BULK READY", "DESIGN APPROVAL", "PAN-INDIA DELIVERY"];

export default function AboutPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">About Us</p>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-navy mb-8">The Novelty Prints</h1>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="text-navy/80 leading-relaxed space-y-4 text-[15px]">
          <p>
            At The Novelty Prints, we believe connections are valuable, and every gift carries a thought and an
            emotion. We create personalized products that feel made especially for the person receiving them.
          </p>
          <p>
            From photos and text to custom printing across mugs, T-shirts, clocks, keychains, cushions, frames
            and more, we bring everyday products closer to your memories and your moments.
          </p>
          <p>
            Our aim isn&apos;t simply to sell another gift item — it&apos;s to make birthdays, anniversaries,
            celebrations, events and special moments a little more personal, and a lot more memorable.
          </p>
        </div>
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-offwhite border border-border">
          <Image src="/images/products/cushion_heart.png" alt="" fill className="object-contain p-12" />
        </div>
      </div>

      <div className="mt-14">
        <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-4">What Makes Us Different</p>
        <div className="flex flex-wrap gap-3">
          {badges.map((b) => (
            <span key={b} className="bg-navy text-white text-xs font-semibold px-4 py-2.5 rounded-full">
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
