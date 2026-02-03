export interface ParsedNewsItem {
  title: string
  content: string
  link: string
  pubDate: string | null
  source: string
  imageUrl: string | null
}

export interface ParseResult {
  success: boolean
  added: number
  skipped: number
  errors: string[]
  items: ParsedNewsItem[]
}
