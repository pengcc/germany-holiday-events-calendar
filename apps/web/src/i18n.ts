export type Locale = "zh" | "de" | "en";

export const locales: Locale[] = ["zh", "de", "en"];

export const copy = {
  zh: {
    appName: "德国假期同步",
    title: "跨州假期重合日历",
    intro: "比较德国各州的学校假期与公共假日，快速找到共同放假的日期。",
    selectStates: "选择联邦州",
    year: "年份",
    calendar: "假期热力图",
    overlap: "所选州共同放假",
    some: "部分所选州放假",
    none: "无匹配假期",
    noDataTitle: "尚无已审核数据",
    noDataBody: "本地数据工具已就绪。完成来源抓取、人工审核与发布后，日历会自动显示。",
    selected: "个州已选择",
    school: "学校假期",
    public: "公共假日",
    statewideOnly: "默认比较仅包含全州适用的假期。",
  },
  de: {
    appName: "Holiday Sync Germany",
    title: "Ferienüberschneidungen nach Bundesland",
    intro: "Schulferien und Feiertage vergleichen und gemeinsame freie Tage erkennen.",
    selectStates: "Bundesländer auswählen",
    year: "Jahr",
    calendar: "Ferien-Heatmap",
    overlap: "Alle gewählten Länder haben frei",
    some: "Einige gewählte Länder haben frei",
    none: "Kein passender Ferientag",
    noDataTitle: "Noch keine geprüften Daten",
    noDataBody:
      "Die lokalen Datenwerkzeuge sind bereit. Nach Abruf, Prüfung und Veröffentlichung erscheint der Kalender automatisch.",
    selected: "Länder ausgewählt",
    school: "Schulferien",
    public: "Feiertag",
    statewideOnly: "Der Standardvergleich berücksichtigt nur landesweit geltende Termine.",
  },
  en: {
    appName: "Holiday Sync Germany",
    title: "Cross-state holiday overlap calendar",
    intro: "Compare school and public holidays across Germany and find shared days off.",
    selectStates: "Select federal states",
    year: "Year",
    calendar: "Holiday heatmap",
    overlap: "All selected states are off",
    some: "Some selected states are off",
    none: "No matching holiday",
    noDataTitle: "No reviewed data yet",
    noDataBody:
      "The local data workflow is ready. The calendar will populate after fetch, human review, and publication.",
    selected: "states selected",
    school: "School holiday",
    public: "Public holiday",
    statewideOnly: "The default comparison includes statewide dates only.",
  },
} as const;

export const stateNames: Record<
  string,
  {
    de: string;
    en: string;
    zh: string;
  }
> = {
  "DE-BW": { de: "Baden-Württemberg", en: "Baden-Württemberg", zh: "巴登-符腾堡州" },
  "DE-BY": { de: "Bayern", en: "Bavaria", zh: "巴伐利亚州" },
  "DE-BE": { de: "Berlin", en: "Berlin", zh: "柏林州" },
  "DE-BB": { de: "Brandenburg", en: "Brandenburg", zh: "勃兰登堡州" },
  "DE-HB": { de: "Bremen", en: "Bremen", zh: "不来梅州" },
  "DE-HH": { de: "Hamburg", en: "Hamburg", zh: "汉堡州" },
  "DE-HE": { de: "Hessen", en: "Hesse", zh: "黑森州" },
  "DE-MV": {
    de: "Mecklenburg-Vorpommern",
    en: "Mecklenburg-Vorpommern",
    zh: "梅克伦堡-前波美拉尼亚州",
  },
  "DE-NI": { de: "Niedersachsen", en: "Lower Saxony", zh: "下萨克森州" },
  "DE-NW": {
    de: "Nordrhein-Westfalen",
    en: "North Rhine-Westphalia",
    zh: "北莱茵-威斯特法伦州",
  },
  "DE-RP": { de: "Rheinland-Pfalz", en: "Rhineland-Palatinate", zh: "莱茵兰-普法尔茨州" },
  "DE-SL": { de: "Saarland", en: "Saarland", zh: "萨尔州" },
  "DE-SN": { de: "Sachsen", en: "Saxony", zh: "萨克森州" },
  "DE-ST": { de: "Sachsen-Anhalt", en: "Saxony-Anhalt", zh: "萨克森-安哈尔特州" },
  "DE-SH": { de: "Schleswig-Holstein", en: "Schleswig-Holstein", zh: "石勒苏益格-荷尔斯泰因州" },
  "DE-TH": { de: "Thüringen", en: "Thuringia", zh: "图林根州" },
};
