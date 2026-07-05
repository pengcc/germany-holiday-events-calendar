import type {
  CityEventCategory,
  CityEventImpactLevel,
  CityEventSource,
} from "../../../packages/data-core/src/city-events-schemas";
import type { Locale } from "./i18n";

type CityEventsCopy = {
  appName: string;
  title: string;
  intro: string;
  disclaimer: string;
  sourceNotice: string;
  language: string;
  selectedEvents: string;
  loading: string;
  errorTitle: string;
  errorBody: string;
  emptyTitle: string;
  emptyBody: string;
  officialSource: string;
  cityLabel: string;
  categoryLabel: string;
  city: Record<"berlin", string>;
  category: Record<CityEventCategory, string>;
  impact: Record<Exclude<CityEventImpactLevel, "none">, string>;
  source: Record<CityEventSource, string>;
};

export const cityEventsCopy = {
  zh: {
    appName: "德国假期与重要活动日历",
    title: "柏林大型活动",
    intro: "浏览精选的柏林大型文化与体育活动，为出行、酒店预订和商务安排提供日期参考。",
    disclaimer:
      "本页面仅收录来自已选官方来源的部分活动，并非完整的柏林活动日历。活动日期可能调整；出行、预订酒店或安排商务行程前，请查看链接的官方来源。",
    sourceNotice: "活动来源与日期说明",
    language: "语言",
    selectedEvents: "精选活动",
    loading: "正在加载精选活动…",
    errorTitle: "城市活动数据暂时无法使用",
    errorBody: "已发布的城市活动数据无法加载或未通过校验，请稍后重试。",
    emptyTitle: "尚无已发布的精选活动",
    emptyBody: "当前已选官方来源和覆盖城市中没有已发布的活动记录。这不代表柏林没有其他活动。",
    officialSource: "查看官方来源",
    cityLabel: "城市",
    categoryLabel: "类别",
    city: { berlin: "柏林" },
    category: { trade_fair: "展会", sport: "体育活动", major_culture: "大型文化活动" },
    impact: { medium: "可能影响出行", high: "明显影响出行" },
    source: {
      messe_berlin: "Messe Berlin",
      scc_events: "SCC Events",
      berlinale: "Berlinale",
      karneval_der_kulturen: "Karneval der Kulturen",
      festival_of_lights: "Festival of Lights",
      csd_berlin: "CSD Berlin",
    },
  },
  de: {
    appName: "Germany Holiday & Events Calendar",
    title: "Großveranstaltungen in Berlin",
    intro:
      "Ausgewählte große Kultur- und Sportveranstaltungen in Berlin als Orientierung für Reisen, Hotelbuchungen und geschäftliche Termine.",
    disclaimer:
      "Diese Seite enthält nur eine Auswahl aus offiziellen Quellen und ist kein vollständiger Berliner Veranstaltungskalender. Termine können sich ändern; prüfen Sie vor Reise-, Hotel- oder Geschäftsentscheidungen die verlinkte offizielle Quelle.",
    sourceNotice: "Hinweis zu Quellen und Terminen",
    language: "Sprache",
    selectedEvents: "Ausgewählte Events",
    loading: "Ausgewählte Events werden geladen…",
    errorTitle: "Stadt-Events derzeit nicht verfügbar",
    errorBody:
      "Die veröffentlichten Stadt-Events konnten nicht geladen oder validiert werden. Bitte später erneut versuchen.",
    emptyTitle: "Noch keine veröffentlichten ausgewählten Events",
    emptyBody:
      "Für die ausgewählten offiziellen Quellen und abgedeckten Städte liegen derzeit keine veröffentlichten Events vor. Das bedeutet nicht, dass es in Berlin keine anderen Events gibt.",
    officialSource: "Offizielle Quelle öffnen",
    cityLabel: "Stadt",
    categoryLabel: "Kategorie",
    city: { berlin: "Berlin" },
    category: { trade_fair: "Messe", sport: "Sport", major_culture: "Großes Kulturereignis" },
    impact: { medium: "Mögliche Reiseauswirkung", high: "Hohe Reiseauswirkung" },
    source: {
      messe_berlin: "Messe Berlin",
      scc_events: "SCC Events",
      berlinale: "Berlinale",
      karneval_der_kulturen: "Karneval der Kulturen",
      festival_of_lights: "Festival of Lights",
      csd_berlin: "CSD Berlin",
    },
  },
  en: {
    appName: "Germany Holiday & Events Calendar",
    title: "Major Events in Berlin",
    intro:
      "Browse selected major culture and sport events in Berlin for travel, hotel, and business planning.",
    disclaimer:
      "This page covers a selection from official sources and is not a complete Berlin event calendar. Dates may change; check the linked official source before making travel, hotel, or business decisions.",
    sourceNotice: "Source and date notice",
    language: "Language",
    selectedEvents: "Selected events",
    loading: "Loading selected events…",
    errorTitle: "City Events data is temporarily unavailable",
    errorBody:
      "Published City Events data could not be loaded or did not pass validation. Please try again later.",
    emptyTitle: "No published selected events yet",
    emptyBody:
      "There are no published events for the selected official sources and covered cities. This does not mean there are no other events in Berlin.",
    officialSource: "Open official source",
    cityLabel: "City",
    categoryLabel: "Category",
    city: { berlin: "Berlin" },
    category: { trade_fair: "Trade fair", sport: "Sport", major_culture: "Major culture" },
    impact: { medium: "Possible travel impact", high: "High travel impact" },
    source: {
      messe_berlin: "Messe Berlin",
      scc_events: "SCC Events",
      berlinale: "Berlinale",
      karneval_der_kulturen: "Karneval der Kulturen",
      festival_of_lights: "Festival of Lights",
      csd_berlin: "CSD Berlin",
    },
  },
} as const satisfies Record<Locale, CityEventsCopy>;
