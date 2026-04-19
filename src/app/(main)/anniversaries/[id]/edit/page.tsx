"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

const LUNAR_MONTH_NAMES = [
  "正月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "冬月", "腊月",
];

export default function EditAnniversaryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isLunar, setIsLunar] = useState(false);
  const [repeatType, setRepeatType] = useState("yearly");
  const [remind, setRemind] = useState(true);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const [lunarYear, setLunarYear] = useState(currentYear);
  const [lunarMonth, setLunarMonth] = useState(1);
  const [lunarDay, setLunarDay] = useState(1);

  const [solarPreview, setSolarPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // 加载现有数据
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/anniversaries/${id}`);
        if (!res.ok) {
          setError("纪念日不存在");
          return;
        }
        const data = await res.json();
        setTitle(data.title);
        setIsLunar(data.isLunar);
        setRepeatType(data.repeatType);
        setRemind(data.remind);
        setNote(data.note || "");

        if (data.isLunar && data.lunarYear) {
          setLunarYear(data.lunarYear);
          setLunarMonth(data.lunarMonth);
          setLunarDay(data.lunarDay);
        } else {
          // 公历：取 YYYY-MM-DD
          const d = new Date(data.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setDate(`${yyyy}-${mm}-${dd}`);
        }
      } catch {
        setError("加载失败");
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id]);

  // 农历公历预览
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
    if (isLunar && !fetching) {
      const timer = setTimeout(fetchSolarPreview, 200);
      return () => clearTimeout(timer);
    }
  }, [isLunar, fetching, fetchSolarPreview]);

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
        body.lunarYear = lunarYear;
        body.lunarMonth = lunarMonth;
        body.lunarDay = lunarDay;
      } else {
        body.date = date;
      }

      const res = await fetch(`/api/anniversaries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          setError(data.error || "保存失败");
        } catch {
          setError(`保存失败 (HTTP ${res.status})`);
        }
        return;
      }

      router.push("/anniversaries");
      router.refresh();
    } catch {
      setError("保存失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear + 5; y >= 1950; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const selectClass =
    "w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  if (fetching) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-4xl animate-heartbeat">💝</div>
        <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
      </div>
    );
  }

  if (error && fetching === false && !title) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-semibold mb-2">{error}</h2>
        <Button variant="outline" onClick={() => router.push("/anniversaries")}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors mb-2 cursor-pointer"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-bold">编辑纪念日</h1>
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

          {/* 日期选择 */}
          {isLunar ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                农历日期 *
              </label>
              <div className="grid grid-cols-3 gap-3">
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
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
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
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
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
              {previewLoading ? (
                <p className="text-xs text-[var(--color-text-muted)]">计算中...</p>
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
              保存修改
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
