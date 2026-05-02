"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";

interface TravelInfo {
  id: string;
  title: string;
  startDate: string;
}

export default function MobileUploadPage({
  params,
}: {
  params: Promise<{ travelId: string }>;
}) {
  const { travelId } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [travel, setTravel] = useState<TravelInfo | null>(null);
  const [travelError, setTravelError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/travel-info/${travelId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTravel({ id: data.id, title: data.title, startDate: data.startDate });
        } else if (res.status === 401) {
          setTravelError("请先在电脑上登录后再扫码");
        } else {
          setTravelError("旅行不存在或已删除");
        }
      })
      .catch(() => setTravelError("网络错误，请检查连接"));
  }, [travelId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);

    selected.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreviews((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("请先选择照片");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("travelId", travelId);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/mobile-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploaded(true);
        setFiles([]);
        setPreviews([]);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("上传失败，请稍后再试");
    } finally {
      setUploading(false);
    }
  };

  if (travelError) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <p className="text-[var(--color-text-secondary)]">{travelError}</p>
        </div>
      </div>
    );
  }

  if (!travel) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">加载中...</p>
      </div>
    );
  }

  if (uploaded) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            上传成功！
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            照片已添加到「{travel.title}」
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            可以关闭此页面，或继续上传更多照片
          </p>
          <button
            onClick={() => {
              setUploaded(false);
              setFiles([]);
              setPreviews([]);
            }}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            继续上传
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ←
          </Link>
          <div>
            <h1 className="font-semibold text-[var(--color-text)]">
              上传照片
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              到「{travel.title}」
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Photo selector */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius)] flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer gap-1"
        >
          <span className="text-3xl">📸</span>
          <span className="text-sm font-medium">点击选择照片</span>
          <span className="text-xs">支持多选，拍照或从相册选择</span>
        </button>

        {/* Preview grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-[var(--radius-sm)] overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center cursor-pointer hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <span className="text-2xl">+</span>
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--color-danger)] text-center">{error}</p>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-full text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading
              ? `上传中 (${files.length} 张)...`
              : `上传 ${files.length} 张照片`}
          </button>
        )}

        <p className="text-xs text-[var(--color-text-muted)] text-center pt-4">
          照片将自动添加到旅行地点列表中
          <br />
          电脑端刷新页面即可看到
        </p>
      </div>
    </div>
  );
}
