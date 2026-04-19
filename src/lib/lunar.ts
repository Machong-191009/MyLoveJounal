import { Lunar, Solar, LunarYear } from "lunar-javascript";

/**
 * 农历日期接口
 */
export interface LunarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-30
}

/**
 * 公历日期 → 农历日期
 */
export function solarToLunar(date: Date): LunarDate {
  const lunar = Lunar.fromDate(date);
  return {
    year: lunar.getYear(),
    month: lunar.getMonth(),
    day: lunar.getDay(),
  };
}

/**
 * 农历日期 → 公历日期
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number
): Date {
  const lunar = Lunar.fromYmd(year, month, day);
  const solar = lunar.getSolar();
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
}

/**
 * 获取农历日期的中文显示
 * 例如：二〇二六年三月初六
 */
export function formatLunarDate(date: Date): string {
  const lunar = Lunar.fromDate(date);
  return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}

/**
 * 获取农历日期的中文完整显示（含年份）
 * 例如：农历二〇二六年三月初六
 */
export function formatLunarDateFull(date: Date): string {
  const lunar = Lunar.fromDate(date);
  return `农历${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}

/**
 * 从存储的公历日期中提取原始农历月日
 * （数据库存的是农历对应的那一年的公历转换日期，
 *   但我们需要的是原始的农历月日来计算下一次出现）
 *
 * 对于农历纪念日，date 字段存的是用户选择的农历日期
 * 转换成的那一年的公历日期。我们需要反推出农历月日。
 */
export function getLunarMonthDay(date: Date): { month: number; day: number } {
  const lunar = Lunar.fromDate(date);
  return {
    month: lunar.getMonth(),
    day: lunar.getDay(),
  };
}

/**
 * 获取某个农历月日在指定公历年份中对应的公历日期
 * 用于计算"下一次"农历纪念日的公历日期
 *
 * @param lunarMonth 农历月（1-12）
 * @param lunarDay 农历日（1-30）
 * @param solarYear 目标公历年份
 * @returns 公历日期，如果该年农历月没有该日则返回该月最后一天
 */
export function getLunarDateInYear(
  lunarMonth: number,
  lunarDay: number,
  solarYear: number
): Date | null {
  // 农历年份通常和公历年份一致或差1
  // 先尝试当前公历年对应的农历年
  const lunarYears = [solarYear - 1, solarYear, solarYear + 1];

  for (const lunarYear of lunarYears) {
    try {
      // 检查该农历年是否有这个月
      const yearObj = LunarYear.fromYear(lunarYear);
      const months = yearObj.getMonths();
      const targetMonth = months.find(
        (m) => m.getMonth() === lunarMonth && !m.isLeap()
      );

      if (!targetMonth) continue;

      // 如果日期超出该月天数，用最后一天
      const maxDay = targetMonth.getDayCount();
      const actualDay = Math.min(lunarDay, maxDay);

      const lunar = Lunar.fromYmd(lunarYear, lunarMonth, actualDay);
      const solar = lunar.getSolar();
      const result = new Date(
        solar.getYear(),
        solar.getMonth() - 1,
        solar.getDay()
      );

      // 检查结果是否在目标公历年份
      if (result.getFullYear() === solarYear) {
        return result;
      }
    } catch {
      // 如果该年份/月份/日期无效，跳过
      continue;
    }
  }

  return null;
}

/**
 * 计算农历纪念日距今天还有多少天
 *
 * @param date 纪念日存储的公历日期（用于反推农历月日）
 * @param repeatType 重复类型
 * @returns 距离下次出现的天数
 */
export function daysUntilNextLunar(
  date: Date | string,
  repeatType: string = "yearly"
): number {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (repeatType === "once") {
    // 一次性的，直接算天数差
    const ms = d.getTime() - today.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // 获取原始农历月日
  const { month: lunarMonth, day: lunarDay } = getLunarMonthDay(d);

  if (repeatType === "yearly") {
    // 先看今年的
    const thisYear = getLunarDateInYear(lunarMonth, lunarDay, today.getFullYear());
    if (thisYear && thisYear >= today) {
      const ms = thisYear.getTime() - today.getTime();
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    // 再看明年的
    const nextYear = getLunarDateInYear(
      lunarMonth,
      lunarDay,
      today.getFullYear() + 1
    );
    if (nextYear) {
      const ms = nextYear.getTime() - today.getTime();
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    }
  }

  if (repeatType === "monthly") {
    // 农历每月重复 - 查找最近的下一个农历同日
    // 从当前农历月开始，最多查13个月
    const todayLunar = Lunar.fromDate(today);
    let lunarYear = todayLunar.getYear();
    let lunarMon = todayLunar.getMonth();

    for (let i = 0; i < 13; i++) {
      try {
        const yearObj = LunarYear.fromYear(lunarYear);
        const months = yearObj.getMonths();
        const targetMonth = months.find(
          (m) => m.getMonth() === lunarMon && !m.isLeap()
        );

        if (targetMonth) {
          const maxDay = targetMonth.getDayCount();
          const actualDay = Math.min(lunarDay, maxDay);
          const lunar = Lunar.fromYmd(lunarYear, lunarMon, actualDay);
          const solar = lunar.getSolar();
          const candidate = new Date(
            solar.getYear(),
            solar.getMonth() - 1,
            solar.getDay()
          );

          if (candidate >= today) {
            const ms = candidate.getTime() - today.getTime();
            return Math.floor(ms / (1000 * 60 * 60 * 24));
          }
        }
      } catch {
        // skip invalid
      }

      // 下一个农历月
      lunarMon++;
      if (lunarMon > 12) {
        lunarMon = 1;
        lunarYear++;
      }
    }
  }

  return 0;
}

/**
 * 获取指定农历年份可用的月份列表
 * @returns 月份列表 [{month: 1, isLeap: false, label: "正月"}, ...]
 */
export function getLunarMonths(
  year: number
): { month: number; isLeap: boolean; label: string; dayCount: number }[] {
  const monthNames = [
    "",
    "正月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "冬月",
    "腊月",
  ];

  try {
    const yearObj = LunarYear.fromYear(year);
    const months = yearObj.getMonths();
    const seen = new Set<string>();
    return months
      .filter((m) => {
        if (m.getMonth() <= 0) return false;
        // Deduplicate: LunarYear.getMonths() can span across years
        const key = `${m.getMonth()}-${m.isLeap()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({
        month: m.getMonth(),
        isLeap: m.isLeap(),
        label: m.isLeap()
          ? `闰${monthNames[m.getMonth()]}`
          : monthNames[m.getMonth()],
        dayCount: m.getDayCount(),
      }));
  } catch {
    // fallback：返回标准12个月
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      isLeap: false,
      label: monthNames[i + 1],
      dayCount: i + 1 === 12 ? 29 : 30, // 大致
    }));
  }
}

/**
 * 获取指定农历年月的天数
 */
export function getLunarDaysInMonth(
  year: number,
  month: number,
  isLeap: boolean = false
): number {
  try {
    const yearObj = LunarYear.fromYear(year);
    const months = yearObj.getMonths();
    const target = months.find(
      (m) => m.getMonth() === month && m.isLeap() === isLeap
    );
    return target ? target.getDayCount() : 30;
  } catch {
    return 30;
  }
}
