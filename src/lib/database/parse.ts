import type { DatabaseTable, TableColumn } from './types.js'

type DatabaseJson = {
  tables?: Array<{
    name?: unknown
    displayName?: unknown
    description?: unknown
    columns?: Array<{
      name?: unknown
      type?: unknown
      description?: unknown
      isPrimaryKey?: unknown
      references?: unknown
    }>
  }>
}

export const parseDatabaseDesignJson = (text: string): DatabaseTable[] => {
  const parsed = JSON.parse(extractJson(text)) as DatabaseJson
  const tables = parsed.tables ?? []

  return tables
    .map((table) => ({
      name: String(table.name ?? '').trim(),
      displayName: String(table.displayName ?? '').trim() || undefined,
      description: String(table.description ?? '').trim(),
      columns: normalizeColumns(table.columns ?? []),
    }))
    .filter((table) => table.name && table.columns.length > 0)
}

const normalizeColumns = (
  columns: NonNullable<DatabaseJson['tables']>[number]['columns'],
): TableColumn[] => {
  return (columns ?? [])
    .map((column) => ({
      name: String(column.name ?? '').trim(),
      type: String(column.type ?? 'text').trim(),
      description: String(column.description ?? '').trim(),
      isPrimaryKey: column.isPrimaryKey === true,
      references:
        typeof column.references === 'string' && column.references.trim()
          ? column.references.trim()
          : undefined,
    }))
    .filter((column) => column.name)
}

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
