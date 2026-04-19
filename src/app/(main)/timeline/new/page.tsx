"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

const moodOptions = [
  { value: "happy", label: "开心", emoji: "😊" },
  { value: "love", label: "甜蜜", emoji: "❤️" },
  { value: "excited", label: "兴奋", emoji: "🎉" },
  { value: "grateful", label: "感恩", emoji: "🙏" },
  { value: "miss", label: "想念", emoji: "🥺" },
  { value: "sad", label: "难过", emoji: "😢" },
  { value: "angry", label: "生气", emoji: "😡" },
  { value: "sorry", label: "道歉", emoji: "😔" },
  { value: "makeup", label: "和好", emoji: "🤗" },
];

export default function NewMemoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [memoryDate, setMemoryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [location, setLocation] = useState("");
  const [mood, setMood] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);

    // Generate previews
    selected.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreviews((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Create the memory
      const memoryRes = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          memoryDate,
          location: location || null,
          mood: mood || null,
          tags,
          isPrivate,
        }),
      });

      if (!memoryRes.ok) {
        const data = await memoryRes.json();
        setError(data.error || "创建失败");
        return;
      }

      const memory = await memoryRes.json();

      // 2. Upload files if any
      if (files.length > 0) {
        const formData = new FormData();
        formData.set("memoryId", memory.id);
        files.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error("File upload failed");
          // Don't block, memory was already created
        }
      }

      router.push(`/timeline/${memory.id}`);
      router.refresh();
    } catch {
      setError("创建失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">记录新回忆</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          记下这个珍贵的瞬间
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="title"
            label="标题 *"
            placeholder="给这段回忆起个名字"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            id="memoryDate"
            label="日期 *"
            type="date"
            value={memoryDate}
            onChange={(e) => setMemoryDate(e.target.value)}
            required
          />

          <Textarea
            id="content"
            label="内容"
            placeholder="记录下当时的细节和感受..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />

          <Input
            id="location"
            label="地点"
            placeholder="这件事发生在哪里"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* Mood Selector */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              心情
            </label>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setMood(mood === option.value ? "" : option.value)
                  }
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                    mood === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
                  }`}
                >
                  <span>{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              标签
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="添加标签"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                添加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs bg-[var(--color-bg-soft)] text-[var(--color-primary)] px-2 py-1 rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              照片/视频
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-wrap gap-3">
              {previews.map((preview, index) => (
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
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm cursor-pointer"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <span className="text-2xl">+</span>
              </button>
            </div>
          </div>

          {/* Private toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              仅自己可见
            </span>
          </label>

          {error && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" loading={loading}>
              保存回忆
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
    </div>
  );
}
