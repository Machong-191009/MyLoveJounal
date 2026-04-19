"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Memory {
  id: string;
  title: string;
  content: string | null;
  memoryDate: string;
  location: string | null;
  mood: string | null;
  tags: string[];
  isPrivate: boolean;
  author: { id: string; username: string; avatarUrl: string | null };
  media: { id: string; fileUrl: string; thumbUrl: string | null; fileType: string | null }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const moodEmojis: Record<string, string> = {
  happy: "😊",
  love: "❤️",
  excited: "🎉",
  grateful: "🙏",
  sad: "😢",
  angry: "😡",
  miss: "🥺",
  sorry: "😔",
  makeup: "🤗",
};

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/memories?${params}`);
      const data = await res.json();

      if (res.ok) {
        setMemories(data.memories);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMemories();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">时间线</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            所有回忆按时间排列
          </p>
        </div>
        <Link href="/timeline/new">
          <Button>+ 记录回忆</Button>
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="搜索回忆..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          搜索
        </Button>
      </form>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-20">
          <div className="text-4xl animate-heartbeat">💝</div>
          <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold mb-2">还没有回忆</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            开始记录你们的故事吧
          </p>
          <Link href="/timeline/new">
            <Button>记录第一条回忆</Button>
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-[var(--color-border)]" />

          <div className="space-y-6">
            {memories.map((memory, index) => (
              <div
                key={memory.id}
                className="relative pl-10 md:pl-14 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Timeline dot */}
                <div className="absolute left-2.5 md:left-4.5 top-4 w-3 h-3 rounded-full bg-[var(--color-primary)] border-2 border-white shadow-sm" />

                <Link href={`/timeline/${memory.id}`}>
                  <Card hover className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {memory.mood && moodEmojis[memory.mood] && (
                            <span>{moodEmojis[memory.mood]}</span>
                          )}
                          <h3 className="font-semibold text-base">
                            {memory.title}
                          </h3>
                          {memory.isPrivate && (
                            <span className="text-xs bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
                              私密
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatDate(memory.memoryDate)} · {memory.author.username}
                          {memory.location && ` · 📍 ${memory.location}`}
                        </p>
                      </div>
                    </div>

                    {memory.content && (
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                        {memory.content}
                      </p>
                    )}

                    {/* Photos preview */}
                    {memory.media.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {memory.media.slice(0, 4).map((m) => (
                          <div
                            key={m.id}
                            className="w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] overflow-hidden flex-shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.thumbUrl || m.fileUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {memory.media.length > 4 && (
                          <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] flex items-center justify-center flex-shrink-0 text-sm text-[var(--color-text-muted)]">
                            +{memory.media.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {memory.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[var(--color-bg-soft)] text-[var(--color-primary)] px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="flex items-center text-sm text-[var(--color-text-secondary)]">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
