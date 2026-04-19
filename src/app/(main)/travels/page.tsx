"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDateDisplay } from "@/lib/utils";

interface TravelSpot {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface Travel {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  spots: TravelSpot[];
  _count: { spots: number };
}

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  planned: {
    label: "计划中",
    color: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    icon: "📋",
  },
  ongoing: {
    label: "进行中",
    color: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    icon: "🚗",
  },
  completed: {
    label: "已完成",
    color: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
    icon: "✅",
  },
};

export default function TravelsPage() {
  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchTravels = useCallback(async () => {
    try {
      const res = await fetch("/api/travels");
      if (res.ok) {
        const data = await res.json();
        setTravels(data);
      }
    } catch (err) {
      console.error("Failed to fetch travels:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTravels();
  }, [fetchTravels]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这次旅行吗？相关的所有地点也会被删除。")) return;

    try {
      const res = await fetch(`/api/travels/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTravels((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredTravels =
    filter === "all" ? travels : travels.filter((t) => t.status === filter);

  // 统计
  const stats = {
    total: travels.length,
    completed: travels.filter((t) => t.status === "completed").length,
    totalSpots: travels.reduce((sum, t) => sum + t._count.spots, 0),
    cities: new Set(
      travels.flatMap((t) => t.spots.map((s) => s.city).filter(Boolean))
    ).size,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">旅行记录</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            记录你们一起走过的每一段旅程
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/map">
            <Button variant="outline" size="sm">
              🗺️ 足迹地图
            </Button>
          </Link>
          <Link href="/travels/new">
            <Button>+ 新旅行</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {travels.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {stats.total}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              总旅行数
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-success)]">
              {stats.completed}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              已完成
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-accent)]">
              {stats.totalSpots}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              总地点数
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-secondary)]">
              {stats.cities}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              到访城市
            </div>
          </Card>
        </div>
      )}

      {/* Filter tabs */}
      {travels.length > 0 && (
        <div className="flex gap-2">
          {[
            { value: "all", label: "全部" },
            { value: "planned", label: "📋 计划中" },
            { value: "ongoing", label: "🚗 进行中" },
            { value: "completed", label: "✅ 已完成" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
                filter === tab.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="text-4xl animate-heartbeat">✈️</div>
          <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
        </div>
      ) : filteredTravels.length === 0 && filter === "all" ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✈️</div>
          <h2 className="text-xl font-semibold mb-2">还没有旅行记录</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            记录你们的第一次旅行吧
          </p>
          <Link href="/travels/new">
            <Button>创建第一次旅行</Button>
          </Link>
        </div>
      ) : filteredTravels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            没有{statusLabels[filter]?.label || ""}的旅行
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTravels.map((travel, index) => {
            const statusInfo = statusLabels[travel.status] || statusLabels.planned;
            const spotLocations = travel.spots
              .map((s) => s.city || s.country)
              .filter(Boolean);
            const uniqueLocations = [...new Set(spotLocations)];

            return (
              <Card
                key={travel.id}
                hover
                className="overflow-hidden animate-slide-up"
                style={
                  { animationDelay: `${index * 0.05}s` } as React.CSSProperties
                }
              >
                {/* Cover image or gradient */}
                {travel.coverUrl ? (
                  <div className="h-40 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={travel.coverUrl}
                      alt={travel.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-[var(--color-bg-soft)] to-[var(--color-border)] flex items-center justify-center">
                    <span className="text-4xl">{statusInfo.icon}</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/travels/${travel.id}`}
                        className="font-semibold text-base hover:text-[var(--color-primary)] transition-colors"
                      >
                        {travel.title}
                      </Link>

                      {/* Status badge */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {travel._count.spots} 个地点
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(travel.id)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer flex-shrink-0"
                    >
                      删除
                    </button>
                  </div>

                  {travel.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                      {travel.description}
                    </p>
                  )}

                  {/* Date range */}
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {formatDateDisplay(travel.startDate)}
                    {travel.endDate && ` — ${formatDateDisplay(travel.endDate)}`}
                  </p>

                  {/* Locations */}
                  {uniqueLocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {uniqueLocations.slice(0, 4).map((loc) => (
                        <span
                          key={loc}
                          className="text-xs bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded"
                        >
                          📍 {loc}
                        </span>
                      ))}
                      {uniqueLocations.length > 4 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          +{uniqueLocations.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/travels/${travel.id}`}
                    className="block mt-3 text-sm text-[var(--color-primary)] hover:underline"
                  >
                    查看详情 →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
