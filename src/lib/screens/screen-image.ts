import type { ScreenSpec } from './types.js'

const elementColors = new Map([
  ['input', '#dff0ed'],
  ['table', '#eef2ff'],
  ['button', '#f2b84b'],
  ['filter', '#fff0c8'],
  ['detail', '#f8fafc'],
  ['status', '#eee8ff'],
  ['navigation', '#e0f2fe'],
])

export const createScreenImage = (screen: ScreenSpec) => {
  const width = 920
  const height = 560
  const elements = screen.elements.slice(0, 8)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#1f2937" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="22" fill="#f8fafc"/>
  <rect x="34" y="32" width="852" height="496" rx="16" fill="#ffffff" stroke="#cbd5e1" filter="url(#shadow)"/>
  <rect x="34" y="32" width="852" height="70" rx="16" fill="#5f48a8"/>
  <path d="M34 84 H886 V102 H34 Z" fill="#5f48a8"/>
  <text x="62" y="76" fill="#ffffff" font-family="Inter, sans-serif" font-size="30" font-weight="800">${escapeXml(screen.name)}</text>
  <text x="62" y="132" fill="#475569" font-family="Inter, sans-serif" font-size="16">${escapeXml(screen.summary)}</text>
  ${elements
    .map((element, index) => {
      const x = 62 + (index % 2) * 408
      const y = 168 + Math.floor(index / 2) * 82
      const color = elementColors.get(element.type) ?? '#f8fafc'
      const width = element.type === 'table' ? 774 : 360
      const actualX = element.type === 'table' ? 62 : x
      const label = `${element.name} / ${element.type}`
      return `
  <g>
    <rect x="${actualX}" y="${y}" width="${width}" height="58" rx="8" fill="${color}" stroke="#cbd5e1"/>
    <text x="${actualX + 18}" y="${y + 25}" fill="#1f2937" font-family="Inter, sans-serif" font-size="16" font-weight="800">${escapeXml(label)}</text>
    <text x="${actualX + 18}" y="${y + 46}" fill="#64748b" font-family="Inter, sans-serif" font-size="13">${escapeXml(truncate(element.description, 44))}</text>
  </g>`
    })
    .join('\n')}
</svg>`.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const truncate = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length)}...` : value

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
