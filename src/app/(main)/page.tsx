import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { daysBetween, formatDateDisplay, daysUntilNext } from "@/lib/utils";
import { daysUntilNextLunar, formatLunarDate } from "@/lib/lunar";
import Card from "@/components/ui/Card";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.coupleId || !user.couple) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">💔</div>
        <h1 className="text-2xl font-bold mb-2">还没有配对</h1>
        <p className="text-[var(--color-text-secondary)]">
          请让你的另一半使用邀请码注册来完成配对
        </p>
      </div>
    );
  }

  const couple = user.couple;
  const togetherDays = daysBetween(new Date(couple.togetherSince));

  // Get recent memories
  const recentMemories = await prisma.memory.findMany({
    where: {
      coupleId: couple.id,
      OR: [{ isPrivate: false }, { isPrivate: true, authorId: user.id }],
    },
    include: {
      author: { select: { username: true } },
      media: { select: { thumbUrl: true, fileUrl: true }, take: 1 },
    },
    orderBy: { memoryDate: "desc" },
    take: 5,
  });

  // Get upcoming anniversaries
  const anniversaries = await prisma.anniversary.findMany({
    where: { coupleId: couple.id },
  });

  const upcomingAnniversaries = anniversaries
    .map((a) => ({
      ...a,
      daysUntil: a.isLunar
        ? daysUntilNextLunar(a.date, a.repeatType)
        : daysUntilNext(a.date, a.repeatType),
    }))
    .filter((a) => a.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Get recent travels
  const recentTravels = await prisma.travel.findMany({
    where: { coupleId: couple.id },
    include: {
      _count: { select: { spots: true } },
    },
    orderBy: { startDate: "desc" },
    take: 3,
  });

  // Get partner info
  const partner = await prisma.user.findFirst({
    where: {
      coupleId: couple.id,
      id: { not: user.id },
    },
    select: { username: true, avatarUrl: true },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero: Days Together */}
      <Card className="p-8 text-center bg-gradient-to-br from-[var(--color-bg-soft)] to-white">
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          {user.username} & {partner?.username || "等待配对中..."}
        </p>
        <div className="text-5xl md:text-7xl font-bold text-[var(--color-primary)] my-4">
          {togetherDays}
        </div>
        <p className="text-lg text-[var(--color-text-secondary)]">
          天的爱情旅程
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          从 {formatDateDisplay(couple.togetherSince)} 开始
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Anniversaries */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              💕 即将到来
            </h2>
            <Link
              href="/anniversaries"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              查看全部
            </Link>
          </div>

          {upcomingAnniversaries.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              <p>还没有纪念日</p>
              <Link
                href="/anniversaries/new"
                className="text-[var(--color-primary)] hover:underline text-sm"
              >
                添加一个
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAnniversaries.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {a.title}
                      {a.isLunar && (
                        <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded">
                          农历
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDateDisplay(a.date)}
                      {a.isLunar && (
                        <span className="ml-1 text-[var(--color-primary)]">
                          · {formatLunarDate(new Date(a.date))}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {a.daysUntil === 0 ? (
                      <span className="text-sm font-bold text-[var(--color-primary)] animate-heartbeat">
                        今天!
                      </span>
                    ) : (
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        还有 <strong className="text-[var(--color-primary)]">{a.daysUntil}</strong> 天
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Memories */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              📸 最近的回忆
            </h2>
            <Link
              href="/timeline"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              查看全部
            </Link>
          </div>

          {recentMemories.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              <p>还没有回忆</p>
              <Link
                href="/timeline/new"
                className="text-[var(--color-primary)] hover:underline text-sm"
              >
                记录第一条
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMemories.map((m) => (
                <Link
                  key={m.id}
                  href={`/timeline/${m.id}`}
                  className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-soft)] -mx-2 px-2 rounded-[var(--radius-sm)] transition-colors"
                >
                  {m.media[0] ? (
                    <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.media[0].thumbUrl || m.media[0].fileUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] flex items-center justify-center flex-shrink-0 text-lg">
                      {m.mood === "happy" ? "😊" : m.mood === "love" ? "❤️" : "📝"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDateDisplay(m.memoryDate)} · {m.author.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Travels */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            ✈️ 旅行足迹
          </h2>
          <Link
            href="/travels"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            查看全部
          </Link>
        </div>

        {recentTravels.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <p>还没有旅行记录</p>
            <Link
              href="/travels/new"
              className="text-[var(--color-primary)] hover:underline text-sm"
            >
              创建第一次旅行
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {recentTravels.map((t) => (
              <Link key={t.id} href={`/travels/${t.id}`}>
                <div className="p-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-bg-soft)] transition-colors">
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatDateDisplay(t.startDate)}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      · {t._count.spots} 个地点
                    </span>
                  </div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                    t.status === "completed"
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : t.status === "ongoing"
                        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                  }`}>
                    {t.status === "completed" ? "已完成" : t.status === "ongoing" ? "进行中" : "计划中"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Link href="/timeline/new">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">📝</span>
            <p className="text-sm font-medium mt-1">记录回忆</p>
          </Card>
        </Link>
        <Link href="/anniversaries/new">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">💝</span>
            <p className="text-sm font-medium mt-1">添加纪念日</p>
          </Card>
        </Link>
        <Link href="/travels/new">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">✈️</span>
            <p className="text-sm font-medium mt-1">新旅行</p>
          </Card>
        </Link>
        <Link href="/timeline">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">📅</span>
            <p className="text-sm font-medium mt-1">时间线</p>
          </Card>
        </Link>
        <Link href="/map">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">🗺️</span>
            <p className="text-sm font-medium mt-1">足迹地图</p>
          </Card>
        </Link>
        <Link href="/anniversaries">
          <Card hover className="p-4 text-center cursor-pointer">
            <span className="text-2xl">💕</span>
            <p className="text-sm font-medium mt-1">纪念日</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
