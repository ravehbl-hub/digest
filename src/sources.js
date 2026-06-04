export const SOURCES_VERSION = 24;

export const DEFAULT_SOURCES = [
  // NEWS
  {
    id: "ynet",
    name: "Ynet",
    nameHe: "ynet",
    url: "https://www.ynet.co.il/Integration/StoryRss2.xml",
    category: "news",
    active: true,
  },
  {
    id: "israelhayom",
    name: "Israel Hayom",
    nameHe: "ישראל היום",
    url: "https://t.me/s/israelhayomnews",
    category: "news",
    active: true,
  },

  // FINANCE — Globes
  {
    id: "globes",
    name: "Globes",
    nameHe: "גלובס",
    url: "https://t.me/s/globesnews",
    category: "finance",
    active: true,
  },

  // FINANCE — TheMarker
  {
    id: "themarker",
    name: "TheMarker",
    nameHe: "דה מרקר",
    url: "https://www.themarker.com/srv/tm-news",
    category: "finance",
    active: true,
  },

  // FINANCE — Calcalist
  {
    id: "calcalist-tg",
    name: "Calcalist (Telegram)",
    nameHe: "כלכליסט (טלגרם)",
    url: "https://t.me/s/calcalist",
    category: "finance",
    active: true,
  },

  // TECH
  {
    id: "geektime",
    name: "Geektime",
    nameHe: "גיקטיים",
    url: "https://t.me/s/geektimecoil",
    category: "tech",
    active: true,
  },
  {
    id: "gadgety",
    name: "Gadgety",
    nameHe: "גאדג'טי",
    url: "https://gadgety.co.il/feed/",
    category: "tech",
    active: true,
  },
  {
    id: "tgspot",
    name: "TGSpot",
    nameHe: "TGspot",
    url: "https://tgspot.co.il/feed/",
    category: "tech",
    active: true,
  },
  {
    id: "techtime",
    name: "TechTime",
    nameHe: "TechTime",
    url: "https://techtime.news/feed/",
    category: "tech",
    active: true,
  },
  {
    id: "avmaster",
    name: "AVMaster",
    nameHe: "AVmaster",
    url: "https://www.avmaster.co.il/feed/",
    category: "tech",
    active: true,
  },
  {
    id: "letsai",
    name: "Let's AI",
    nameHe: "Let's AI",
    url: "https://t.me/s/fuzznewmedia",
    category: "tech",
    active: true,
  },
  {
    id: "internetisrael",
    name: "Internet Israel",
    nameHe: "אינטרנט ישראל",
    url: "https://internet-israel.com/feed/",
    category: "tech",
    active: true,
  },

  {
    id: "newtech",
    name: "New Tech",
    nameHe: "ניו טק",
    url: "https://www.new-techonline.com/?cat=137&feed=rss2",
    category: "tech",
    active: true,
  },

  {
    id: "newtechmagazine",
    name: "New Tech Magazine",
    nameHe: "ניו טק מגזין",
    url: "https://www.new-techonline.com/?cat=139&feed=rss2",
    category: "tech",
    active: true,
  },

  // SCIENCE
  {
    id: "hidaan",
    name: "HaYadan",
    nameHe: "הידען",
    url: "https://t.me/s/hayadan1",
    category: "science",
    active: true,
  },

  {
    id: "machonweizmanresearch",
    name: "Machon Weizman",
    nameHe: "מכון ויזמן מחקרים",
    url: "https://heb.wis-wander.weizmann.ac.il/feeds/research/all",
    category: "science",
    active: true,
  },

  {
    id: "machonweizmannews",
    name: "Machon Weizman",
    nameHe: "מכון ויזמן חדשות",
    url: "https://heb.wis-wander.weizmann.ac.il/feeds/news",
    category: "science",
    active: true,
  },

  // AUTO
  {
    id: "evmcoil",
    name: "EV Magazine",
    nameHe: "מגזין רכב חשמלי",
    url: "https://t.me/s/evmcoil",
    category: "auto",
    active: true,
  },
  {
    id: "cartube",
    name: "CarTube",
    nameHe: "קארטיוב",
    url: "https://www.cartube.co.il/?format=feed&type=rss",
    category: "auto",
    active: true,
  },
  {
    id: "thecar",
    name: "The Car",
    nameHe: "The Car",
    url: "https://thecar.co.il/feed/",
    category: "auto",
    active: true,
  },
  {
    id: "wheel",
    name: "Wheel",
    nameHe: "גלגל",
    url: "https://t.me/s/wheel_news",
    category: "auto",
    active: true,
  },

  // DEFENSE
  {
    id: "israeldefense",
    name: "Israel Defense",
    nameHe: "ישראל דיפנס",
    url: "https://nitter.net/_israeldefense/rss",
    category: "defense",
    active: true,
  },
  {
    id: "newtechmilitary",
    name: "New Tech",
    nameHe: "ניו טק צבא",
    url: "https://www.new-techonline.com/?cat=43&feed=rss2",
    category: "defense",
    active: true,
  },
];

export const CATEGORIES = {
  all: { en: "All", he: "הכל" },
  news: { en: "News", he: "חדשות" },
  finance: { en: "Finance", he: "כלכלה" },
  tech: { en: "Tech", he: "טכנולוגיה" },
  science: { en: "Science", he: "מדע" },
  auto: { en: "Auto", he: "רכב" },
  defense: { en: "Defense", he: "ביטחון" },
};
