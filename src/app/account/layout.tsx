import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-6 sm:py-10 md:py-14 overflow-x-hidden">
      <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-4 md:gap-10">
        <aside className="w-full md:w-auto">
          <AccountNav />
        </aside>
        <main className="min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}

