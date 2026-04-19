import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  let coupleNames: { me: string; partner: string } | null = null;

  if (user?.coupleId) {
    const partner = await prisma.user.findFirst({
      where: {
        coupleId: user.coupleId,
        id: { not: user.id },
      },
      select: { username: true },
    });
    if (partner) {
      coupleNames = { me: user.username, partner: partner.username };
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar coupleNames={coupleNames} />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
