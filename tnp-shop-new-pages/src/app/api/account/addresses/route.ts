import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(addresses).where(eq(addresses.userId, session.user.id));
  return NextResponse.json({ addresses: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.fullName || !body.phone || !body.line1 || !body.city || !body.state || !body.pincode) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  const [created] = await db
    .insert(addresses)
    .values({
      userId: session.user.id,
      label: body.label || "Home",
      fullName: body.fullName,
      phone: body.phone,
      line1: body.line1,
      line2: body.line2,
      landmark: body.landmark,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      isDefault: !!body.isDefault,
    })
    .returning();

  return NextResponse.json({ address: created });
}
