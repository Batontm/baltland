export interface RssFeed {
  id: string
  name: string
  url: string
}

export const DEFAULT_RSS_FEEDS: RssFeed[] = [
  { id: "lenta-realty", name: "Lenta.ru Недвижимость", url: "https://lenta.ru/rss/articles/realty" },
  { id: "ria", name: "РИА Новости", url: "https://ria.ru/export/rss2/archive/index.xml" },
  { id: "interfax", name: "Интерфакс", url: "https://www.interfax.ru/rss.asp" },
  { id: "kommersant", name: "Коммерсант", url: "https://www.kommersant.ru/RSS/news.xml" },
  { id: "tass", name: "ТАСС", url: "https://tass.ru/rss/v2.xml" },
  { id: "rbc", name: "РБК", url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss" },
  { id: "gazeta", name: "Газета.Ru", url: "https://www.gazeta.ru/export/rss/lenta.xml" },
]
