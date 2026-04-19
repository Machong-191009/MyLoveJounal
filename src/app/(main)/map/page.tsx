"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import MapView from "@/components/map";
import type { MapSpot } from "@/components/map";

interface TravelSpot {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: string;
  longitude: string;
  visitDate: string | null;
  note: string | null;
  photos: string[];
}

interface Travel {
  id: string;
  title: string;
  status: string;
  startDate: string;
  spots: TravelSpot[];
  _count: { spots: number };
}

export default function MapPage() {
  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTravels = useCallback(async () => {
    try {
      const res = await fetch("/api/travels");
      if (res.ok) {
        const data = await res.json();
        setTravels(data);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTravels();
  }, [fetchTravels]);

  // Flatten all spots from all travels
  const allSpots: MapSpot[] = travels.flatMap((travel) =>
    travel.spots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      latitude: parseFloat(spot.latitude),
      longitude: parseFloat(spot.longitude),
      city: spot.city,
      country: spot.country,
      note: spot.note,
      photos: spot.photos,
      visitDate: spot.visitDate,
      travelTitle: travel.title,
    }))
  );

  // Statistics
  const stats = {
    travels: travels.length,
    completedTravels: travels.filter((t) => t.status === "completed").length,
    totalSpots: allSpots.length,
    cities: new Set(allSpots.map((s) => s.city).filter(Boolean)).size,
    countries: new Set(allSpots.map((s) => s.country).filter(Boolean)).size,
  };

  // Group spots by country for breakdown
  const countryBreakdown: Record<string, { spots: number; cities: Set<string> }> = {};
  allSpots.forEach((spot) => {
    const country = spot.country || "未知";
    if (!countryBreakdown[country]) {
      countryBreakdown[country] = { spots: 0, cities: new Set() };
    }
    countryBreakdown[country].spots++;
    if (spot.city) {
      countryBreakdown[country].cities.add(spot.city);
    }
  });

  if (loading) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-4xl animate-heartbeat">🗺️</div>
        <p className="text-[var(--color-text-muted)] mt-2">加载足迹地图...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">足迹地图</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          你们一起走过的每一个角落
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-[var(--color-primary)]">
            {stats.travels}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">旅行</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-[var(--color-success)]">
            {stats.completedTravels}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">已完成</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-[var(--color-accent)]">
            {stats.totalSpots}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">足迹</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-[var(--color-secondary)]">
            {stats.cities}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">城市</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-[var(--color-warning)]">
            {stats.countries}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">国家</div>
        </Card>
      </div>

      {/* Main Map */}
      {allSpots.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2">地图上还没有足迹</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            创建旅行并添加地点后，你们的足迹会显示在这里
          </p>
          <Link
            href="/travels/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            创建第一次旅行
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <MapView
            spots={allSpots}
            height="500px"
            showPopups={true}
          />
        </Card>
      )}

      {/* Country/Region Breakdown */}
      {Object.keys(countryBreakdown).length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">足迹分布</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(countryBreakdown)
              .sort((a, b) => b[1].spots - a[1].spots)
              .map(([country, data]) => (
                <Card key={country} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{country}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {data.cities.size > 0
                          ? `${data.cities.size} 个城市`
                          : ""}
                        {data.cities.size > 0 && " · "}
                        {data.spots} 个地点
                      </p>
                    </div>
                    <div className="text-2xl">
                      {country === "中国"
                        ? "🇨🇳"
                        : country === "日本"
                          ? "🇯🇵"
                          : country === "韩国"
                            ? "🇰🇷"
                            : country === "美国"
                              ? "🇺🇸"
                              : country === "英国"
                                ? "🇬🇧"
                                : country === "法国"
                                  ? "🇫🇷"
                                  : country === "泰国"
                                    ? "🇹🇭"
                                    : "🌍"}
                    </div>
                  </div>
                  {data.cities.size > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[...data.cities].map((city) => (
                        <span
                          key={city}
                          className="text-xs bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded"
                        >
                          {city}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Recent Travels Quick Links */}
      {travels.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">关联旅行</h2>
            <Link
              href="/travels"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              查看全部
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {travels.map((travel) => (
              <Link
                key={travel.id}
                href={`/travels/${travel.id}`}
                className="flex-shrink-0"
              >
                <Card
                  hover
                  className="p-3 w-48"
                >
                  <p className="font-medium text-sm truncate">{travel.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {travel._count.spots} 个地点
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
