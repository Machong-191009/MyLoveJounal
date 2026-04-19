"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

// 农历月份名称（纯静态，不依赖任何库）
const LUNAR_MONTH_NAMES = [
  "正月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "冬月", "腊月",
];

export default function NewAnniversaryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isLunar, setIsLunar] = useState(false);
  const [repeatType, setRepeatType] = useState("yearly");
  const [remind, setRemind] = useState(true);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 农历日期状态
  const currentYear = new Date().getFullYear();
  const [lunarYear, setLunarYear] = useState(currentYear);
  const [lunarMonth, setLunarMonth] = useState(1);
  const [lunarDay, setLunarDay] = useState(1);

  // 公历预览（通过 API 获取）
  const [solarPreview, setSolarPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // 获取农历→公历的预览
  const fetchSolarPreview = useCallback(async () => {
    if (!isLunar) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/anniversaries/lunar-preview?year=${lunarYear}&month=${lunarMonth}&day=${lunarDay}`
      );
      if (res.ok) {
        const data = await res.json();
        setSolarPreview(data.solarDate || "");
      } else {
        setSolarPreview("日期无效");
      }
    } catch {
      setSolarPreview("");
    } finally {
      setPreviewLoading(false);
    }
  }, [isLunar, lunarYear, lunarMonth, lunarDay]);

  useEffect(() => {
    if (isLunar) {
      const timer = setTimeout(fetchSolarPreview, 200);
      return () => clearTimeout(timer);
    }
  }, [isLunar, fetchSolarPreview]);

  // 农历每月最多30天，大部分29或30天，这里前端用30，API端会做校验
  const lunarDaysCount = 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!title) {
        setError("请填写纪念日名称");
        setLoading(false);
        return;
      }

      if (!isLunar && !date) {
        setError("请选择日期");
        setLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        title,
        isLunar,
        repeatType,
        remind,
        note: note || null,
      };

      if (isLunar) {
        // 农历模式：发送农历年月日，让 API 端做转换
        body.lunarYear = lunarYear;
        body.lunarMonth = lunarMonth;
        body.lunarDay = lunarDay;
      } else {
        body.date = date;
      }

      const res = await fetch("/api/anniversaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      router.push("/anniversaries");
      router.refresh();
    } catch {
      setError("创建失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: "在一起的日子", icon: "💑" },
    { label: "第一次约会", icon: "🌹" },
    { label: "生日", icon: "🎂" },
    { label: "结婚纪念日", icon: "💍" },
    { label: "第一次见面", icon: "👋" },
    { label: "第一次旅行", icon: "✈️" },
  ];

  // 年份范围 1950 ~ 当前+5
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear + 5; y >= 1950; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const selectClass =
    "w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">添加纪念日</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          记住每一个重要的日子
        </p>
      </div>

      {/* 快捷预设 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setTitle(preset.label)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
              title === preset.label
                ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
            }`}
          >
            <span>{preset.icon}</span>
            {preset.label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="title"
            label="纪念日名称 *"
            placeholder="例如：在一起的日子、生日"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* 农历开关 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsLunar(!isLunar)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                isLunar
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-border)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isLunar ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-[var(--color-text)]">
              农历日期
            </span>
            {isLunar && (
              <span className="text-xs text-[var(--color-primary)] bg-[var(--color-bg-soft)] px-2 py-0.5 rounded-full">
                农历模式
              </span>
            )}
          </label>

          {/* 日期选择 - 公历或农历 */}
          {isLunar ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                农历日期 *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* 年 */}
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    年
                  </label>
                  <select
                    value={lunarYear}
                    onChange={(e) => setLunarYear(Number(e.target.value))}
                    className={selectClass}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 月 */}
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    月
                  </label>
                  <select
                    value={lunarMonth}
                    onChange={(e) => setLunarMonth(Number(e.target.value))}
                    className={selectClass}
                  >
                    {LUNAR_MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 日 */}
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    日
                  </label>
                  <select
                    value={lunarDay}
                    onChange={(e) => setLunarDay(Number(e.target.value))}
                    className={selectClass}
                  >
                    {Array.from({ length: lunarDaysCount }, (_, i) => i + 1).map(
                      (d) => (
                        <option key={d} value={d}>
                          {d < 10 ? `0${d}` : d}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              {/* 公历预览 */}
              {previewLoading ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  计算中...
                </p>
              ) : solarPreview && solarPreview !== "日期无效" ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  对应公历：{solarPreview}
                </p>
              ) : solarPreview === "日期无效" ? (
                <p className="text-xs text-[var(--color-danger)]">
                  该农历日期无效，请重新选择
                </p>
              ) : null}
            </div>
          ) : (
            <Input
              id="date"
              label="日期 *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              重复类型
            </label>
            <div className="flex gap-3">
              {[
                { value: "yearly", label: "每年" },
                { value: "monthly", label: "每月" },
                { value: "once", label: "一次性" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRepeatType(option.value)}
                  className={`px-4 py-2 rounded-[var(--radius-sm)] text-sm border transition-colors cursor-pointer ${
                    repeatType === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            id="note"
            label="备注"
            placeholder="关于这个纪念日的备注..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remind}
              onChange={(e) => setRemind(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              开启提醒
            </span>
          </label>

          {error && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" loading={loading}>
              保存纪念日
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
