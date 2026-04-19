"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import ImageCropper from "@/components/ui/ImageCropper";

export default function NewTravelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropDone = (croppedFile: File) => {
    setCoverFile(croppedFile);
    setCoverPreview(URL.createObjectURL(croppedFile));
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!title) {
        setError("请填写旅行标题");
        setLoading(false);
        return;
      }
      if (!startDate) {
        setError("请选择开始日期");
        setLoading(false);
        return;
      }

      // 1. Create the travel
      const res = await fetch("/api/travels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          startDate,
          endDate: endDate || null,
          status,
        }),
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          setError(data.error || "创建失败");
        } catch {
          setError(`创建失败 (HTTP ${res.status})`);
        }
        return;
      }

      const travel = await res.json();

      // 2. Upload cover image if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("files", coverFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.media && uploadData.media.length > 0) {
            // 3. Update travel with coverUrl
            await fetch(`/api/travels/${travel.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coverUrl: uploadData.media[0].fileUrl }),
            });
          }
        }
      }

      router.push(`/travels/${travel.id}`);
    } catch {
      setError("创建失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    { label: "周末短途", icon: "🚗", desc: "周末小旅行" },
    { label: "城市探索", icon: "🏙️", desc: "探索一座新城市" },
    { label: "海边度假", icon: "🏖️", desc: "阳光、沙滩、海浪" },
    { label: "山间徒步", icon: "🏔️", desc: "在大自然中漫步" },
    { label: "出国旅行", icon: "🌍", desc: "异国的风景与文化" },
    { label: "纪念日旅行", icon: "💕", desc: "为特殊日子准备" },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">创建新旅行</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          规划你们的下一段旅程
        </p>
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-2 mb-6">
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setTitle(t.label);
              setDescription(t.desc);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
              title === t.label
                ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="title"
            label="旅行标题 *"
            placeholder="例如：丽江之行、东京蜜月旅行"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            id="description"
            label="旅行简介"
            placeholder="描述一下这次旅行..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="startDate"
              label="开始日期 *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              id="endDate"
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              封面图片
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
            {coverPreview ? (
              <div className="relative group rounded-[var(--radius-sm)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="封面预览"
                  className="w-full block"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[var(--radius-sm)] flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white/90 rounded-full text-sm text-gray-800 cursor-pointer hover:bg-white transition-colors"
                  >
                    更换
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropSrc(coverPreview)}
                    className="px-3 py-1.5 bg-white/90 rounded-full text-sm text-gray-800 cursor-pointer hover:bg-white transition-colors"
                  >
                    裁剪
                  </button>
                  <button
                    type="button"
                    onClick={removeCover}
                    className="px-3 py-1.5 bg-white/90 rounded-full text-sm text-red-600 cursor-pointer hover:bg-white transition-colors"
                  >
                    移除
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <span className="text-3xl mb-1">📷</span>
                <span className="text-sm">点击上传封面图片</span>
                <span className="text-xs mt-0.5">为旅行选一张代表性的照片</span>
              </button>
            )}
          </div>

          {/* Status selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              状态
            </label>
            <div className="flex gap-3">
              {[
                { value: "planned", label: "📋 计划中", desc: "还在筹备" },
                { value: "ongoing", label: "🚗 进行中", desc: "正在旅途中" },
                { value: "completed", label: "✅ 已完成", desc: "已经结束" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`flex-1 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm border transition-colors cursor-pointer text-center ${
                    status === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs mt-0.5 text-[var(--color-text-muted)]">
                    {option.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" loading={loading}>
              创建旅行
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
        创建后可以在旅行详情页添加地点和照片
      </p>

      {/* Image Cropper Modal */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
          fileName="cover.jpg"
        />
      )}
    </div>
  );
}
