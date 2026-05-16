import type { ScreenSpec } from './types.js'

type ScreenPlanJson = {
  screens?: Array<{
    id?: unknown
    name?: unknown
    summary?: unknown
    elements?: Array<{
      name?: unknown
      type?: unknown
      description?: unknown
    }>
  }>
}

export const parseScreenPlanJson = (text: string): ScreenSpec[] => {
  const parsed = JSON.parse(extractJson(text)) as ScreenPlanJson

  return (parsed.screens ?? [])
    .map((screen, index) => ({
      id: normalizeId(String(screen.id ?? screen.name ?? `screen_${index + 1}`)),
      name: String(screen.name ?? '').trim(),
      summary: String(screen.summary ?? '').trim(),
      elements: (screen.elements ?? [])
        .map((element) => ({
          name: String(element.name ?? '').trim(),
          type: String(element.type ?? 'detail').trim(),
          description: String(element.description ?? '').trim(),
        }))
        .filter((element) => element.name),
    }))
    .filter((screen) => screen.name && screen.elements.length > 0)
}

const normalizeId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'screen'

const extractJson = (text: string) => {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match?.[1]) return match[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)

  return trimmed
}
