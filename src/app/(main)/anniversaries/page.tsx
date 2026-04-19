"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDateDisplay } from "@/lib/utils";

interface Anniversary {
  id: string;
  title: string;
  date: string;
  isLunar: boolean;
  repeatType: string;
  remind: boolean;
  note: string | null;
  daysUntil: number;
  lunarDateDisplay: string | null;
}

const repeatLabels: Record<string, string> = {
  yearly: "每年",
  monthly: "每月",
  once: "一次性",
};

export default function AnniversariesPage() {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnniversaries = useCallback(async () => {
    try {
      const res = await fetch("/api/anniversaries");
      if (res.ok) {
        const data = await res.json();
        setAnniversaries(data);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnniversaries();
  }, [fetchAnniversaries]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个纪念日吗？")) return;

    try {
      const res = await fetch(`/api/anniversaries/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAnniversaries((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // 按倒计时排序（API 已计算好 daysUntil）
  const sortedAnniversaries = [...anniversaries].sort(
    (a, b) => a.daysUntil - b.daysUntil
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">纪念日</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            不要忘记每一个重要的日子
          </p>
        </div>
        <Link href="/anniversaries/new">
          <Button>+ 添加纪念日</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="text-4xl animate-heartbeat">💝</div>
          <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
        </div>
      ) : sortedAnniversaries.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💕</div>
          <h2 className="text-xl font-semibold mb-2">还没有纪念日</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            添加你们的重要日子吧
          </p>
          <Link href="/anniversaries/new">
            <Button>添加第一个纪念日</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedAnniversaries.map((anniversary, index) => (
            <Card
              key={anniversary.id}
              className="p-5 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 倒计时 */}
                  <div className="text-center min-w-[70px]">
                    {anniversary.daysUntil === 0 ? (
                      <div>
                        <div className="text-2xl font-bold text-[var(--color-primary)] animate-heartbeat">
                          今天!
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold text-[var(--color-primary)]">
                          {anniversary.daysUntil}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          天后
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div>
                    <h3 className="font-semibold text-base">
                      {anniversary.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] flex-wrap">
                      <span>{formatDateDisplay(anniversary.date)}</span>
                      {anniversary.isLunar && anniversary.lunarDateDisplay && (
                        <>
                          <span className="text-[var(--color-text-muted)]">·</span>
                          <span className="text-[var(--color-primary)]">
                            {anniversary.lunarDateDisplay}
                          </span>
                        </>
                      )}
                      <span className="text-xs bg-[var(--color-bg-soft)] px-2 py-0.5 rounded">
                        {repeatLabels[anniversary.repeatType] || anniversary.repeatType}
                      </span>
                      {anniversary.isLunar && (
                        <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded">
                          农历
                        </span>
                      )}
                    </div>
                    {anniversary.note && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {anniversary.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link
                    href={`/anniversaries/${anniversary.id}/edit`}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(anniversary.id)}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                  >
                    删除
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
