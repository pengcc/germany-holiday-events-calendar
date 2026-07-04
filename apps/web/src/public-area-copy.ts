import type { Locale } from "./i18n";

export type PublicArea = "holidays" | "trade-fairs" | "culture-events";

type PublicAreaCopy = {
  navigationLabel: string;
  holidays: string;
  tradeFairs: string;
  cultureEvents: string;
  messeTitle: string;
  messeEyebrow: string;
  messeIntro: string;
  messeStatusTitle: string;
  messeStatusBody: string;
  language: string;
  appName: string;
};

export const publicAreaCopy = {
  zh: {
    navigationLabel: "公共网站区域",
    holidays: "假期日历",
    tradeFairs: "展会活动",
    cultureEvents: "文化活动",
    messeTitle: "精选展会活动",
    messeEyebrow: "展会与商务行程规划",
    messeIntro: "这里将展示经过审核的精选官方展会活动，帮助规划出行、住宿和商务安排。",
    messeStatusTitle: "展会数据尚未发布",
    messeStatusBody: "此区域正在规划中。未来内容将仅涵盖已选官方来源，不会提供完整的展会数据库。",
    language: "语言",
    appName: "德国假期与重要活动日历",
  },
  de: {
    navigationLabel: "Öffentliche Bereiche",
    holidays: "Feiertage",
    tradeFairs: "Messen",
    cultureEvents: "Kultur-Events",
    messeTitle: "Ausgewählte Messe-Events",
    messeEyebrow: "Messe- und Geschäftsreiseplanung",
    messeIntro:
      "Hier werden künftig geprüfte, ausgewählte offizielle Messe-Events für Reise-, Unterkunfts- und Geschäftsplanung angezeigt.",
    messeStatusTitle: "Noch keine Messedaten veröffentlicht",
    messeStatusBody:
      "Dieser Bereich ist geplant. Künftige Inhalte stammen nur aus ausgewählten offiziellen Quellen und bilden keine vollständige Messedatenbank.",
    language: "Sprache",
    appName: "Germany Holiday & Events Calendar",
  },
  en: {
    navigationLabel: "Public site areas",
    holidays: "Holidays",
    tradeFairs: "Trade Fairs",
    cultureEvents: "Culture Events",
    messeTitle: "Selected Trade Fair Events",
    messeEyebrow: "Trade fair and business travel planning",
    messeIntro:
      "This area will present a reviewed selection of official trade-fair events for travel, accommodation, and business planning.",
    messeStatusTitle: "Trade-fair data is not published yet",
    messeStatusBody:
      "This area is planned. Future content will cover selected official sources only and will not be a complete trade-fair database.",
    language: "Language",
    appName: "Germany Holiday & Events Calendar",
  },
} as const satisfies Record<Locale, PublicAreaCopy>;
