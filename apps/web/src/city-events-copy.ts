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
  language: string;
  holidayExplorer: string;
  selectedEvents: string;
  loading: string;
  errorTitle: string;
  errorBody: string;
  emptyTitle: string;
  emptyBody: string;
  officialSource: string;
  date: string;
  cityLabel: string;
  categoryLabel: string;
  sourceLabel: string;
  city: Record<"berlin", string>;
  category: Record<CityEventCategory, string>;
  impact: Record<Exclude<CityEventImpactLevel, "none">, string>;
  source: Record<CityEventSource, string>;
};

export const cityEventsCopy = {
  zh: {
    appName: "德国假期与重要活动日历",
    title: "精选城市活动",
    intro: "浏览经过审核、可能影响出行规划、酒店预订或商务安排的重点官方城市活动。",
    disclaimer:
      "活动日期基于已选官方来源整理，可能会调整。出行、订酒店或安排商务行程前，请以链接的官方来源为准。本页面不提供完整城市活动列表。",
    language: "语言",
    holidayExplorer: "假期日历",
    selectedEvents: "已审核的精选活动",
    loading: "正在加载已审核的城市活动…",
    errorTitle: "城市活动数据暂时无法使用",
    errorBody: "已发布的城市活动数据无法加载或未通过校验，请稍后重试。",
    emptyTitle: "尚无已发布的精选活动",
    emptyBody: "当前已选官方来源和覆盖城市中没有已发布的活动记录。这不代表柏林没有其他活动。",
    officialSource: "查看官方来源",
    date: "日期",
    cityLabel: "城市",
    categoryLabel: "类别",
    sourceLabel: "来源",
    city: { berlin: "柏林" },
    category: { trade_fair: "展会", sport: "体育活动", major_culture: "大型文化活动" },
    impact: { medium: "可能影响出行", high: "明显出行影响" },
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
    title: "Ausgewählte Stadt-Events",
    intro:
      "Geprüfte, ausgewählte offizielle Stadt-Events für Reiseplanung, Hotelbuchungen und geschäftliche Terminplanung.",
    disclaimer:
      "Die Termine basieren auf ausgewählten offiziellen Quellen und können sich ändern. Bitte prüfen Sie vor Reise-, Hotel- oder Geschäftsentscheidungen die verlinkte offizielle Quelle. Dies ist keine vollständige Veranstaltungsliste.",
    language: "Sprache",
    holidayExplorer: "Ferienkalender",
    selectedEvents: "Geprüfte ausgewählte Events",
    loading: "Geprüfte Stadt-Events werden geladen…",
    errorTitle: "Stadt-Events derzeit nicht verfügbar",
    errorBody:
      "Die veröffentlichten Stadt-Events konnten nicht geladen oder validiert werden. Bitte später erneut versuchen.",
    emptyTitle: "Noch keine veröffentlichten ausgewählten Events",
    emptyBody:
      "Für die ausgewählten offiziellen Quellen und abgedeckten Städte liegen derzeit keine veröffentlichten Events vor. Das bedeutet nicht, dass es in Berlin keine anderen Events gibt.",
    officialSource: "Offizielle Quelle öffnen",
    date: "Datum",
    cityLabel: "Stadt",
    categoryLabel: "Kategorie",
    sourceLabel: "Quelle",
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
    title: "Selected City Events",
    intro:
      "Browse a reviewed selection of official city events that may matter for travel, hotel, or business planning.",
    disclaimer:
      "Dates are based on selected official sources and may change. Please check the linked official source before making travel, hotel, or business decisions. This is not a complete city event listing.",
    language: "Language",
    holidayExplorer: "Holiday Explorer",
    selectedEvents: "Reviewed selected events",
    loading: "Loading reviewed city events…",
    errorTitle: "City Events data is temporarily unavailable",
    errorBody:
      "Published City Events data could not be loaded or did not pass validation. Please try again later.",
    emptyTitle: "No published selected events yet",
    emptyBody:
      "There are no published events for the selected official sources and covered cities. This does not mean there are no other events in Berlin.",
    officialSource: "Open official source",
    date: "Date",
    cityLabel: "City",
    categoryLabel: "Category",
    sourceLabel: "Source",
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
