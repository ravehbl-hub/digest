export const SOURCES_VERSION = 15;

export const DEFAULT_SOURCES = [
  // NEWS
  { id: 'ynet',              name: 'Ynet',                    nameHe: 'ynet',                    url: 'https://www.ynet.co.il/Integration/StoryRss2.xml',                              category: 'news',    active: true },
  { id: 'israelhayom',       name: 'Israel Hayom',            nameHe: 'ישראל היום',              url: 'https://t.me/s/israelhayomnews',                                                category: 'news',    active: true },

  // FINANCE — Globes
  { id: 'globes',            name: 'Globes',                  nameHe: 'גלובס',                   url: 'https://t.me/s/globesnews',                                                      category: 'finance', active: true },

  // FINANCE — TheMarker
  { id: 'themarker',         name: 'TheMarker',               nameHe: 'דה מרקר',                 url: 'https://www.themarker.com/srv/tm-news',                                         category: 'finance', active: true },

  // FINANCE — Calcalist
  { id: 'calcalist-tg',      name: 'Calcalist (Telegram)',     nameHe: 'כלכליסט (טלגרם)',         url: 'https://t.me/s/calcalist',                                                     category: 'finance', active: true },
  { id: 'ecoilchannel',      name: 'Economy Channel',         nameHe: 'ערוץ הכלכלה',             url: 'https://www.mako.co.il/rss/31750a2610f26110VgnVCM1000005201000aRCRD.xml',       category: 'finance', active: true },

  // TECH
  { id: 'geektime',          name: 'Geektime',                nameHe: 'גיקטיים',                 url: 'https://t.me/s/geektimecoil',                                                  category: 'tech',    active: true },
  { id: 'gadgety',           name: 'Gadgety',                 nameHe: "גאדג'טי",                 url: 'https://gadgety.co.il/feed/',                                                   category: 'tech',    active: true },
  { id: 'tgspot',            name: 'TGSpot',                  nameHe: 'TGspot',                  url: 'https://tgspot.co.il/feed/',                                                    category: 'tech',    active: true },
  { id: 'techtime',          name: 'TechTime',                nameHe: 'TechTime',                url: 'https://techtime.news/feed/',                                                   category: 'tech',    active: true },
  { id: 'avmaster',          name: 'AVMaster',                nameHe: 'AVmaster',                url: 'https://www.avmaster.co.il/feed/',                                              category: 'tech',    active: true },
  { id: 'letsai',            name: "Let's AI",                nameHe: "Let's AI",                url: 'https://t.me/s/fuzznewmedia',                                                   category: 'tech',    active: true },
  { id: 'internetisrael',    name: 'Internet Israel',         nameHe: 'אינטרנט ישראל',           url: 'https://internet-israel.com/feed/',                                             category: 'tech',    active: true },

  // SCIENCE
  { id: 'hidaan',            name: 'HaYadan',                 nameHe: 'הידען',                   url: 'https://www.hayadan.org.il/feed/',                                               category: 'science', active: true },
  { id: 'davidson',          name: 'Davidson Institute',      nameHe: 'מגזין מכון דוידסון',      url: 'https://davidson.org.il/?feed=rss2',                                            category: 'science', active: false },

  // AUTO
  { id: 'cartube',           name: 'CarTube',                 nameHe: 'קארטיוב',                 url: 'https://www.cartube.co.il/?format=feed&type=rss',                               category: 'auto',    active: true },
  { id: 'thecar',            name: 'The Car',                 nameHe: 'The Car',                 url: 'https://thecar.co.il/feed/',                                                    category: 'auto',    active: true },
  { id: 'wheel',             name: 'Wheel',                   nameHe: 'גלגל',                    url: 'https://t.me/s/wheel_news',                                                    category: 'auto',    active: true },

  // DEFENSE
  { id: 'israeldefense',     name: 'Israel Defense',          nameHe: 'ישראל דיפנס',             url: 'https://www.israeldefense.co.il/rss.xml',                                      category: 'defense', active: true },
];

export const CATEGORIES = {
  all:     { en: 'All',       he: 'הכל' },
  news:    { en: 'News',      he: 'חדשות' },
  finance: { en: 'Finance',   he: 'כלכלה' },
  tech:    { en: 'Tech',      he: 'טכנולוגיה' },
  science: { en: 'Science',   he: 'מדע' },
  auto:    { en: 'Auto',      he: 'רכב' },
  defense: { en: 'Defense',   he: 'ביטחון' },
};
