import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-6 sm:py-10 md:py-14">
      <div className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-10">
        <aside>
          <AccountNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
