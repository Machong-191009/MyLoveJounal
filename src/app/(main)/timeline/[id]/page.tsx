import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { formatDateDisplay } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Link from "next/link";
import DeleteMemoryButton from "./DeleteButton";

const moodLabels: Record<string, string> = {
  happy: "😊 开心",
  love: "❤️ 甜蜜",
  excited: "🎉 兴奋",
  grateful: "🙏 感恩",
  sad: "😢 难过",
  angry: "😡 生气",
  miss: "🥺 想念",
  sorry: "😔 道歉",
  makeup: "🤗 和好",
};

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!user.coupleId) redirect("/");

  const memory = await prisma.memory.findFirst({
    where: {
      id,
      coupleId: user.coupleId,
      OR: [{ isPrivate: false }, { isPrivate: true, authorId: user.id }],
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      media: true,
    },
  });

  if (!memory) notFound();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-4">
        <Link
          href="/timeline"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          &larr; 返回时间线
        </Link>
      </div>

      <Card className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{memory.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                <span>{formatDateDisplay(memory.memoryDate)}</span>
                <span>by {memory.author.username}</span>
                {memory.location && <span>📍 {memory.location}</span>}
                {memory.mood && moodLabels[memory.mood] && (
                  <span>{moodLabels[memory.mood]}</span>
                )}
                {memory.isPrivate && (
                  <span className="text-xs bg-[var(--color-bg-soft)] px-2 py-0.5 rounded">
                    🔒 私密
                  </span>
                )}
              </div>
            </div>
            <DeleteMemoryButton memoryId={memory.id} />
          </div>
        </div>

        {/* Content */}
        {memory.content && (
          <div className="prose prose-sm max-w-none mb-6">
            <p className="text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
              {memory.content}
            </p>
          </div>
        )}

        {/* Photos */}
        {memory.media.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
              照片 ({memory.media.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {memory.media.map((m) => (
                <div
                  key={m.id}
                  className="aspect-square rounded-[var(--radius)] overflow-hidden bg-[var(--color-bg-soft)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.fileUrl}
                    alt={m.caption || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[var(--color-bg-soft)] text-[var(--color-primary)] px-3 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
