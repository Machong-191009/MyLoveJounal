declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
    toYmd(): string;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromDate(date: Date): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): Solar;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInChinese(): string;
    toFullString(): string;
    toString(): string;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getMonths(): LunarMonth[];
  }

  export class LunarMonth {
    getYear(): number;
    getMonth(): number;
    isLeap(): boolean;
    getDayCount(): number;
  }
}
