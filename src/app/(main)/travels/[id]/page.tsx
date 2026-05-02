"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import ImageCropper from "@/components/ui/ImageCropper";
import MapView from "@/components/map";
import type { MapSpot } from "@/components/map";
import { formatDateDisplay } from "@/lib/utils";

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
  sortOrder: number;
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
}

interface GeocodeResult {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  displayName: string;
}

const statusLabels: Record<string, { label: string; icon: string }> = {
  planned: { label: "计划中", icon: "📋" },
  ongoing: { label: "进行中", icon: "🚗" },
  completed: { label: "已完成", icon: "✅" },
};

export default function TravelDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [travel, setTravel] = useState<Travel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cover image upload
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [coverError, setCoverError] = useState("");

  // Add spot form state
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotCity, setSpotCity] = useState("");
  const [spotCountry, setSpotCountry] = useState("");
  const [spotLat, setSpotLat] = useState("");
  const [spotLng, setSpotLng] = useState("");
  const [spotDate, setSpotDate] = useState("");
  const [spotNote, setSpotNote] = useState("");
  const [spotFiles, setSpotFiles] = useState<File[]>([]);
  const [spotPreviews, setSpotPreviews] = useState<string[]>([]);
  const spotFileInputRef = useRef<HTMLInputElement>(null);
  const [addingSpot, setAddingSpot] = useState(false);
  const [spotError, setSpotError] = useState("");
  const [spotCropSrc, setSpotCropSrc] = useState<string | null>(null);
  const [spotCropIndex, setSpotCropIndex] = useState<number | null>(null);

  // Geocode search
  const [searchingSpotLocation, setSearchingSpotLocation] = useState(false);
  const [spotSearchResults, setSpotSearchResults] = useState<GeocodeResult[]>([]);
  const [spotSearchError, setSpotSearchError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);

  // Reposition existing spots
  const [repositioningSpotId, setRepositioningSpotId] = useState<string | null>(null);
  const [repositionResults, setRepositionResults] = useState<Record<string, GeocodeResult[]>>({});
  const [repositionErrors, setRepositionErrors] = useState<Record<string, string>>({});
  const [repositionLoading, setRepositionLoading] = useState<Record<string, boolean>>({});

  // Edit status
  const [editingStatus, setEditingStatus] = useState(false);

  // Quick upload
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [quickPreviews, setQuickPreviews] = useState<string[]>([]);
  const [quickUploading, setQuickUploading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [quickCropSrc, setQuickCropSrc] = useState<string | null>(null);
  const [quickCropIndex, setQuickCropIndex] = useState<number | null>(null);

  // Photo viewer
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState(0);

  const fetchTravel = useCallback(async () => {
    try {
      const res = await fetch(`/api/travels/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTravel(data);
      } else {
        setError("旅行不存在");
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTravel();
  }, [fetchTravel]);

  // Cover image: open cropper on file select
  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverCropSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // Upload cropped cover
  const handleCoverCropDone = async (croppedFile: File) => {
    setCoverCropSrc(null);
    if (!travel) return;

    setUploadingCover(true);
    setCoverError("");
    try {
      const formData = new FormData();
      formData.append("files", croppedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        setCoverError(errData.error || "封面上传失败");
        return;
      }

      const uploadData = await uploadRes.json();
      if (uploadData.media && uploadData.media.length > 0) {
        const coverUrl = uploadData.media[0].fileUrl;
        const updateRes = await fetch(`/api/travels/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverUrl }),
        });

        if (updateRes.ok) {
          setTravel((prev) => (prev ? { ...prev, coverUrl } : prev));
        } else {
          const errData = await updateRes.json().catch(() => ({}));
          setCoverError(errData.error || "封面保存失败");
        }
      }
    } catch {
      setCoverError("封面上传出错，请稍后再试");
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle map click to populate lat/lng
  const handleMapClick = (lat: number, lng: number) => {
    setSpotLat(lat.toFixed(6));
    setSpotLng(lng.toFixed(6));
    setSelectedLocation({
      id: "map-selection",
      name: spotName || "地图选点",
      city: spotCity || null,
      country: spotCountry || null,
      latitude: lat,
      longitude: lng,
      displayName: `地图选点 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
    if (!showAddSpot) {
      setShowAddSpot(true);
    }
  };

  const searchLocation = async ({
    name,
    city,
    country,
  }: {
    name: string;
    city?: string | null;
    country?: string | null;
  }) => {
    const searchParams = new URLSearchParams({
      name: name.trim(),
    });

    if (city?.trim()) {
      searchParams.set("city", city.trim());
    }

    if (country?.trim()) {
      searchParams.set("country", country.trim());
    }

    const res = await fetch(`/api/geocode?${searchParams.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "地点搜索失败");
    }

    return (data.results || []) as GeocodeResult[];
  };

  const handleSearchSpotLocation = async () => {
    if (!spotName.trim()) {
      setSpotSearchError("请填写地点名称，或者同时填写城市或国家");
      return;
    }

    setSpotSearchError("");
    setSpotSearchResults([]);
    setSearchingSpotLocation(true);

    try {
      const results = await searchLocation({
        name: spotName,
        city: spotCity,
        country: spotCountry,
      });
      setSpotSearchResults(results);
      if (results.length === 0) {
        setSpotSearchError("没有找到匹配地点，请换个关键词试试，也可以直接在上方地图点选");
      }
    } catch (err) {
      setSpotSearchError(err instanceof Error ? err.message : "地点搜索失败");
    } finally {
      setSearchingSpotLocation(false);
    }
  };

  const applySpotLocation = (result: GeocodeResult) => {
    setSpotLat(result.latitude.toFixed(6));
    setSpotLng(result.longitude.toFixed(6));
    setSelectedLocation(result);
    setSpotSearchResults([]);
    setSpotSearchError("");

    if (!spotCity && result.city) {
      setSpotCity(result.city);
    }
    if (!spotCountry && result.country) {
      setSpotCountry(result.country);
    }
  };

  const clearSpotForm = () => {
    setSpotName("");
    setSpotCity("");
    setSpotCountry("");
    setSpotLat("");
    setSpotLng("");
    setSpotDate("");
    setSpotNote("");
    setSpotFiles([]);
    setSpotPreviews([]);
    setSpotSearchResults([]);
    setSpotSearchError("");
    setSelectedLocation(null);
  };

  const handleSearchExistingSpot = async (spot: TravelSpot) => {
    if (!spot.name.trim()) {
      setRepositionErrors((prev) => ({
        ...prev,
        [spot.id]: "缺少地点名称，无法自动查询",
      }));
      return;
    }

    setRepositioningSpotId(spot.id);
    setRepositionErrors((prev) => ({ ...prev, [spot.id]: "" }));
    setRepositionResults((prev) => ({ ...prev, [spot.id]: [] }));
    setRepositionLoading((prev) => ({ ...prev, [spot.id]: true }));

    try {
      const results = await searchLocation({
        name: spot.name,
        city: spot.city,
        country: spot.country,
      });
      setRepositionResults((prev) => ({ ...prev, [spot.id]: results }));
      if (results.length === 0) {
        setRepositionErrors((prev) => ({
          ...prev,
          [spot.id]: "没有找到匹配地点，请尝试修改名称后重试，或直接在地图上手动定位",
        }));
      }
    } catch (err) {
      setRepositionErrors((prev) => ({
        ...prev,
        [spot.id]: err instanceof Error ? err.message : "地点搜索失败",
      }));
    } finally {
      setRepositionLoading((prev) => ({ ...prev, [spot.id]: false }));
    }
  };

  const handleApplyExistingSpotLocation = async (
    spot: TravelSpot,
    result: GeocodeResult
  ) => {
    setRepositionErrors((prev) => ({ ...prev, [spot.id]: "" }));
    setRepositionLoading((prev) => ({ ...prev, [spot.id]: true }));

    try {
      const res = await fetch(`/api/travels/${id}/spots`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: spot.id,
          latitude: result.latitude,
          longitude: result.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "更新地点失败");
      }

      setRepositionResults((prev) => ({ ...prev, [spot.id]: [] }));
      setRepositioningSpotId(null);
      await fetchTravel();
    } catch (err) {
      setRepositionErrors((prev) => ({
        ...prev,
        [spot.id]: err instanceof Error ? err.message : "更新地点失败",
      }));
    } finally {
      setRepositionLoading((prev) => ({ ...prev, [spot.id]: false }));
    }
  };

  // Spot photo selection
  const handleSpotFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setSpotFiles((prev) => [...prev, ...selected]);

    selected.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSpotPreviews((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
    if (spotFileInputRef.current) spotFileInputRef.current.value = "";
  };

  // Crop a spot photo
  const handleSpotCropDone = (croppedFile: File) => {
    if (spotCropIndex === null) return;
    setSpotFiles((prev) => {
      const next = [...prev];
      next[spotCropIndex] = croppedFile;
      return next;
    });
    setSpotPreviews((prev) => {
      const next = [...prev];
      next[spotCropIndex] = URL.createObjectURL(croppedFile);
      return next;
    });
    setSpotCropSrc(null);
    setSpotCropIndex(null);
  };

  const removeSpotFile = (index: number) => {
    setSpotFiles((prev) => prev.filter((_, i) => i !== index));
    setSpotPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new spot
  const handleAddSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpotError("");

    if (!spotName) {
      setSpotError("请填写地点名称");
      return;
    }
    if (!spotLat || !spotLng) {
      setSpotError("请在地图上点击选择位置，或手动输入坐标");
      return;
    }

    setAddingSpot(true);
    try {
      const res = await fetch(`/api/travels/${id}/spots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spotName,
          city: spotCity || null,
          country: spotCountry || null,
          latitude: parseFloat(spotLat),
          longitude: parseFloat(spotLng),
          visitDate: spotDate || null,
          note: spotNote || null,
          photos: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSpotError(data.error || "添加失败");
        return;
      }

      const spot = await res.json();

      if (spotFiles.length > 0) {
        const formData = new FormData();
        spotFiles.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.media && uploadData.media.length > 0) {
            const photoUrls = uploadData.media.map(
              (m: { fileUrl: string }) => m.fileUrl
            );

            await fetch(`/api/travels/${id}/spots`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                spotId: spot.id,
                photos: photoUrls,
              }),
            });
          }
        }
      }

      clearSpotForm();
      setShowAddSpot(false);
      fetchTravel();
    } catch {
      setSpotError("添加失败");
    } finally {
      setAddingSpot(false);
    }
  };

  // Delete a spot
  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm("确定要删除这个地点吗？")) return;

    try {
      const res = await fetch(`/api/travels/${id}/spots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId }),
      });
      if (res.ok) {
        fetchTravel();
      }
    } catch {
      console.error("Delete spot failed");
    }
  };

  // Update travel status
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/travels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTravel((prev) => (prev ? { ...prev, status: newStatus } : prev));
        setEditingStatus(false);
      }
    } catch {
      console.error("Update status failed");
    }
  };

  // Convert spots for map component
  const mapSpots: MapSpot[] = travel
    ? travel.spots.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: parseFloat(s.latitude),
        longitude: parseFloat(s.longitude),
        city: s.city,
        country: s.country,
        note: s.note,
        photos: s.photos,
        visitDate: s.visitDate,
      }))
    : [];

  if (loading) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-4xl animate-heartbeat">✈️</div>
        <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
      </div>
    );
  }

  if (error || !travel) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-semibold mb-2">{error || "旅行不存在"}</h2>
        <Link href="/travels">
          <Button variant="outline">返回旅行列表</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[travel.status] || statusLabels.planned;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cover Image */}
      <div className="relative">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFileSelect}
          className="hidden"
        />
        {travel.coverUrl ? (
          <div className="relative group rounded-[var(--radius)] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={travel.coverUrl}
              alt={travel.title}
              className="w-full block"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="px-4 py-2 bg-white/90 rounded-full text-sm text-gray-800 cursor-pointer hover:bg-white transition-colors disabled:opacity-50"
              >
                {uploadingCover ? "上传中..." : "更换封面"}
              </button>
              <button
                type="button"
                onClick={() => setCoverCropSrc(travel.coverUrl!)}
                disabled={uploadingCover}
                className="px-4 py-2 bg-white/90 rounded-full text-sm text-gray-800 cursor-pointer hover:bg-white transition-colors disabled:opacity-50"
              >
                裁剪
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="w-full h-40 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius)] flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploadingCover ? (
              <>
                <span className="text-2xl mb-1">⏳</span>
                <span className="text-sm">上传中...</span>
              </>
            ) : (
              <>
                <span className="text-3xl mb-1">📷</span>
                <span className="text-sm">添加旅行封面图片</span>
                <span className="text-xs mt-0.5">
                  一张代表这次旅行的照片
                </span>
              </>
            )}
          </button>
        )}
        {coverError && (
          <p className="mt-2 text-sm text-[var(--color-danger)]">{coverError}</p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/travels"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              ← 返回列表
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{travel.title}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            {/* Status */}
            {editingStatus ? (
              <div className="flex gap-1">
                {Object.entries(statusLabels).map(([value, info]) => (
                  <button
                    key={value}
                    onClick={() => handleStatusChange(value)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
                      travel.status === value
                        ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-light)]"
                    }`}
                  >
                    {info.icon} {info.label}
                  </button>
                ))}
                <button
                  onClick={() => setEditingStatus(false)}
                  className="text-xs text-[var(--color-text-muted)] ml-1 cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
              >
                {statusInfo.icon} {statusInfo.label}
              </button>
            )}
            <span className="text-sm text-[var(--color-text-muted)]">
              {formatDateDisplay(travel.startDate)}
              {travel.endDate && ` — ${formatDateDisplay(travel.endDate)}`}
            </span>
          </div>
          {travel.description && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              {travel.description}
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-2 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            🗺️ 旅行地图
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            点击地图选择位置来添加地点
          </p>
        </div>
        <div className="px-4 pb-4">
          <MapView
            spots={mapSpots}
            onMapClick={handleMapClick}
            temporarySelection={
              selectedLocation
                ? {
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    label: selectedLocation.displayName,
                  }
                : null
            }
            height="350px"
          />
        </div>
      </Card>

      {/* Add Spot Section */}
      <Card className="p-4">
        {!showAddSpot ? (
          <button
            onClick={() => setShowAddSpot(true)}
            className="w-full py-3 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer text-sm"
          >
            + 添加新地点（或点击上方地图选择位置）
          </button>
        ) : (
          <form onSubmit={handleAddSpot} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">添加新地点</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddSpot(false);
                  clearSpotForm();
                }}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                取消
              </button>
            </div>

            <Input
              id="spotName"
              label="地点名称 *"
              placeholder="例如：西湖、东京塔"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="spotCity"
                label="城市"
                placeholder="例如：杭州"
                value={spotCity}
                onChange={(e) => setSpotCity(e.target.value)}
              />
              <Input
                id="spotCountry"
                label="国家"
                placeholder="例如：中国"
                value={spotCountry}
                onChange={(e) => setSpotCountry(e.target.value)}
              />
            </div>

            {/* Auto-locate */}
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">自动查询位置</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    填写地点名称后点击查找，可同时填写城市/国家更精准定位
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSearchSpotLocation}
                  loading={searchingSpotLocation}
                >
                  查找位置
                </Button>
              </div>

              {selectedLocation && (
                <div className="rounded-[var(--radius-sm)] bg-white px-3 py-2 text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  已选位置：{selectedLocation.displayName}
                </div>
              )}

              {spotSearchError && (
                <p className="text-sm text-[var(--color-danger)]">{spotSearchError}</p>
              )}

              {spotSearchResults.length > 0 && (
                <div className="space-y-2">
                  {spotSearchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => applySpotLocation(result)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-card)]"
                    >
                      <div className="text-sm font-medium text-[var(--color-text)]">
                        {result.name}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {result.displayName}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="spotLat"
                label="纬度 *"
                placeholder="点地图自动填入"
                value={spotLat}
                onChange={(e) => setSpotLat(e.target.value)}
                required
              />
              <Input
                id="spotLng"
                label="经度 *"
                placeholder="点地图自动填入"
                value={spotLng}
                onChange={(e) => setSpotLng(e.target.value)}
                required
              />
            </div>

            {spotLat && spotLng && (
              <p className="text-xs text-[var(--color-text-muted)]">
                📍 已选择坐标: {parseFloat(spotLat).toFixed(4)},{" "}
                {parseFloat(spotLng).toFixed(4)}
              </p>
            )}

            <Input
              id="spotDate"
              label="到访日期"
              type="date"
              value={spotDate}
              onChange={(e) => setSpotDate(e.target.value)}
            />

            <Textarea
              id="spotNote"
              label="备注"
              placeholder="关于这个地点的备注..."
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
              rows={2}
            />

            {/* Spot Photos Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                地点照片
              </label>
              <input
                ref={spotFileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleSpotFileSelect}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                {spotPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSpotCropSrc(preview);
                          setSpotCropIndex(index);
                        }}
                        className="text-white text-xs cursor-pointer px-1"
                      >
                        裁剪
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSpotFile(index)}
                        className="text-red-300 text-xs cursor-pointer px-1"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => spotFileInputRef.current?.click()}
                  className="w-20 h-20 rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <span className="text-2xl">+</span>
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                为这个地点添加照片，记录美好瞬间
              </p>
            </div>

            {spotError && (
              <p className="text-sm text-[var(--color-danger)]">{spotError}</p>
            )}

            <Button type="submit" loading={addingSpot} size="sm">
              添加地点
            </Button>
          </form>
        )}
      </Card>

      {/* Spots List */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          📍 地点列表
          <span className="text-sm font-normal text-[var(--color-text-muted)]">
            ({travel.spots.length} 个地点)
          </span>
        </h2>

        {travel.spots.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-2">📍</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              还没有添加地点，点击上方地图开始添加
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {travel.spots.map((spot, index) => (
              <Card
                key={spot.id}
                className="p-4 animate-slide-up"
                style={
                  { animationDelay: `${index * 0.05}s` } as React.CSSProperties
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm">{spot.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5 flex-wrap">
                        {(spot.city || spot.country) && (
                          <span>
                            {[spot.city, spot.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {spot.visitDate && (
                          <span>{formatDateDisplay(spot.visitDate)}</span>
                        )}
                        <span>
                          {parseFloat(spot.latitude).toFixed(4)}, {parseFloat(spot.longitude).toFixed(4)}
                        </span>
                      </div>
                      {spot.note && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                          {spot.note}
                        </p>
                      )}
                      {spot.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {spot.photos.slice(0, 4).map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setViewingPhotos(spot.photos);
                                setViewingPhotoIndex(i);
                              }}
                              className="w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {spot.photos.length > 4 && (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPhotos(spot.photos);
                                setViewingPhotoIndex(4);
                              }}
                              className="w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] flex items-center justify-center text-xs text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                            >
                              +{spot.photos.length - 4}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSearchExistingSpot(spot)}
                      className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      重新定位
                    </button>
                    <button
                      onClick={() => handleDeleteSpot(spot.id)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* Reposition UI */}
                {repositioningSpotId === spot.id && (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">为这个地点重新查询位置</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          默认使用地点名称、城市和国家来搜索位置
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRepositioningSpotId(null);
                          setRepositionResults((prev) => ({ ...prev, [spot.id]: [] }));
                          setRepositionErrors((prev) => ({ ...prev, [spot.id]: "" }));
                        }}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                      >
                        关闭
                      </button>
                    </div>

                    {repositionErrors[spot.id] && (
                      <p className="text-sm text-[var(--color-danger)]">{repositionErrors[spot.id]}</p>
                    )}

                    {repositionResults[spot.id]?.length ? (
                      <div className="space-y-2">
                        {repositionResults[spot.id].map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleApplyExistingSpotLocation(spot, result)}
                            disabled={!!repositionLoading[spot.id]}
                            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-card)] disabled:opacity-60"
                          >
                            <div className="text-sm font-medium text-[var(--color-text)]">
                              {result.name}
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                              {result.displayName}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {repositionLoading[spot.id] ? "查询中..." : "点击上方重新定位按钮，搜索后会在这里显示可选位置"}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhotos && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setViewingPhotos(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingPhotos[viewingPhotoIndex]}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />

            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setViewingPhotoIndex((prev) =>
                    prev > 0 ? prev - 1 : viewingPhotos!.length - 1
                  )
                }
                className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors text-lg"
              >
                ‹
              </button>
              <span className="text-white text-sm bg-black/60 px-3 py-1 rounded-full">
                {viewingPhotoIndex + 1} / {viewingPhotos.length}
              </span>
              <button
                onClick={() =>
                  setViewingPhotoIndex((prev) =>
                    prev < viewingPhotos!.length - 1 ? prev + 1 : 0
                  )
                }
                className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors text-lg"
              >
                ›
              </button>
            </div>

            <button
              onClick={() => setViewingPhotos(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Cover Cropper Modal */}
      {coverCropSrc && (
        <ImageCropper
          imageSrc={coverCropSrc}
          onCropDone={handleCoverCropDone}
          onCancel={() => setCoverCropSrc(null)}
          fileName="cover.jpg"
        />
      )}

      {/* Spot Photo Cropper Modal */}
      {spotCropSrc && (
        <ImageCropper
          imageSrc={spotCropSrc}
          onCropDone={handleSpotCropDone}
          onCancel={() => {
            setSpotCropSrc(null);
            setSpotCropIndex(null);
          }}
          fileName="spot-photo.jpg"
        />
      )}
    </div>
  );
}
