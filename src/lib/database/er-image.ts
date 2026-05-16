import type { DatabaseTable } from './types.js'

const colors = ['#5f48a8', '#228b83', '#c4516a', '#8a6f22', '#4665a8', '#7a4d8f']

export const createErImage = (tables: DatabaseTable[]) => {
  const width = 1120
  const columnWidth = 320
  const gapX = 56
  const gapY = 42
  const rowHeight = 26
  const headerHeight = 52

  const tableLayouts = tables.map((table, index) => {
    const x = 40 + (index % 3) * (columnWidth + gapX)
    const y =
      36 +
      Math.floor(index / 3) *
        (headerHeight + Math.min(table.columns.length, 7) * rowHeight + gapY + 26)
    const height = headerHeight + Math.min(table.columns.length, 7) * rowHeight + 22
    return { table, x, y, width: columnWidth, height }
  })
  const height =
    Math.max(...tableLayouts.map((layout) => layout.y + layout.height), 420) + 36

  const byName = new Map(tableLayouts.map((layout) => [layout.table.name, layout]))
  const relations = tableLayouts.flatMap((layout) =>
    layout.table.columns.flatMap((column) => {
      const [tableName] = column.references?.split('.') ?? []
      const target = tableName ? byName.get(tableName) : undefined
      return target ? [{ from: layout, to: target }] : []
    }),
  )

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#5f6574" />
    </marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#1f2937" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="18" fill="#f8fafc"/>
  ${relations
    .map((relation) => {
      const fromX = relation.from.x + relation.from.width
      const fromY = relation.from.y + relation.from.height / 2
      const toX = relation.to.x
      const toY = relation.to.y + relation.to.height / 2
      const midX = (fromX + toX) / 2
      return `<path d="M${fromX} ${fromY} C${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" fill="none" stroke="#5f6574" stroke-width="2.2" marker-end="url(#arrow)"/>`
    })
    .join('\n  ')}
  ${tableLayouts
    .map((layout, index) => {
      const color = colors[index % colors.length]
      const visibleColumns = layout.table.columns.slice(0, 7)
      const displayName = layout.table.displayName ?? layout.table.name
      return `
  <g filter="url(#shadow)">
    <rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${headerHeight}" rx="10" fill="${color}"/>
    <path d="M${layout.x} ${layout.y + 42} H${layout.x + layout.width} V${layout.y + headerHeight} H${layout.x} Z" fill="${color}"/>
    <text x="${layout.x + 18}" y="${layout.y + 31}" fill="#ffffff" font-family="Inter, sans-serif" font-size="22" font-weight="800">${escapeXml(displayName)}</text>
    <text x="${layout.x + 18}" y="${layout.y + 47}" fill="#ede9fe" font-family="Inter, sans-serif" font-size="12" font-weight="700">${escapeXml(layout.table.name)}</text>
    ${visibleColumns
      .map((column, columnIndex) => {
        const y = layout.y + headerHeight + 24 + columnIndex * rowHeight
        const prefix = column.isPrimaryKey ? 'PK ' : column.references ? 'FK ' : ''
        const suffix = column.type ? `: ${column.type}` : ''
        return `<text x="${layout.x + 18}" y="${y}" fill="#334155" font-family="Inter, sans-serif" font-size="15">${escapeXml(prefix + column.name + suffix)}</text>`
      })
      .join('\n    ')}
  </g>`
    })
    .join('\n')}
</svg>`.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
