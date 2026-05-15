const DAY_LABELS = [
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十"
] as const;

type LunarParts = {
  yearName: string;
  month: string;
  day: string;
};

export function formatLunarMonthTitle(date: Date): string | undefined {
  const parts = lunarParts(date);
  if (!parts) return undefined;
  return `${parts.yearName}年${parts.month}`;
}

export function formatLunarDayLabel(date: Date): string | undefined {
  const parts = lunarParts(date);
  if (!parts) return undefined;
  const dayNumber = Number.parseInt(parts.day, 10);
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > DAY_LABELS.length) return parts.day;
  return DAY_LABELS[dayNumber - 1];
}

function lunarParts(date: Date): LunarParts | undefined {
  try {
    const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const parts = formatter.formatToParts(date);
    const yearName = parts.find((part) => String(part.type) === "yearName")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!yearName || !month || !day) return undefined;
    return { yearName, month, day };
  } catch {
    return undefined;
  }
}
