import type { DatabaseTable, TableColumn } from '../database/index.js'

export const normalizeTables = (tables: DatabaseTable[] | undefined) => {
  const normalized = (tables ?? [])
    .map((table) => ({
      ...table,
      name: toSnakeIdentifier(table.name),
      columns: table.columns
        .map((column) => ({
          ...column,
          name: toSnakeIdentifier(column.name),
          references: normalizeReference(column.references),
        }))
        .filter((column) => column.name),
    }))
    .filter((table) => table.name && table.columns.length > 0)

  return normalized.length > 0 ? normalized : fallbackTables
}

export const createDrizzleSchema = (tables: DatabaseTable[]) => `import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

${tables.map(createDrizzleTable).join('\n\n')}
`

export const createMigration = (tables: DatabaseTable[]) =>
  `${tables.map(createTableSql).join('\n\n')}\n`

const fallbackTables: DatabaseTable[] = [
  {
    name: 'items',
    displayName: '項目',
    description: 'アプリケーションの基本項目を管理する',
    columns: [
      { name: 'id', type: 'text', description: '主キー', isPrimaryKey: true },
      { name: 'name', type: 'text', description: '名前' },
      { name: 'created_at', type: 'datetime', description: '作成日時' },
    ],
  },
]

const normalizeReference = (reference: string | undefined) => {
  if (!reference) return undefined
  const [table, column] = reference.split('.')
  const tableName = toSnakeIdentifier(table ?? '')
  const columnName = toSnakeIdentifier(column ?? '')
  return tableName && columnName ? `${tableName}.${columnName}` : undefined
}

const createDrizzleTable = (table: DatabaseTable) => {
  const columns = table.columns.map((column) => createDrizzleColumn(column))
  return `export const ${toCamelIdentifier(table.name)} = sqliteTable('${table.name}', {
${columns.map((column) => `  ${column},`).join('\n')}
})`
}

const createDrizzleColumn = (column: TableColumn) => {
  const reference = column.references
    ? `.references(() => ${toCamelIdentifier(column.references.split('.')[0])}.${toCamelIdentifier(column.references.split('.')[1])})`
    : ''
  const primaryKey = column.isPrimaryKey ? '.primaryKey()' : ''
  const notNull = column.isPrimaryKey ? '.notNull()' : ''
  const defaultNow =
    /^(created_at|updated_at)$/.test(column.name) && !column.isPrimaryKey
      ? '.default(sql`(CURRENT_TIMESTAMP)`)'
      : ''

  if (isIntegerType(column.type)) {
    return `${toCamelIdentifier(column.name)}: integer('${column.name}')${primaryKey}${notNull}${reference}${defaultNow}`
  }

  return `${toCamelIdentifier(column.name)}: text('${column.name}')${primaryKey}${notNull}${reference}${defaultNow}`
}

const createTableSql = (table: DatabaseTable) => {
  const columnSql = table.columns.map((column) => `  ${createColumnSql(column)}`)
  const foreignKeys = table.columns
    .filter((column) => column.references)
    .map((column) => {
      const [referenceTable, referenceColumn] = column.references?.split('.') ?? []
      return `  FOREIGN KEY (${quoteIdentifier(column.name)}) REFERENCES ${quoteIdentifier(referenceTable)}(${quoteIdentifier(referenceColumn)})`
    })

  return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(table.name)} (
${[...columnSql, ...foreignKeys].join(',\n')}
);`
}

const createColumnSql = (column: TableColumn) => {
  const constraints = []
  if (column.isPrimaryKey) constraints.push('PRIMARY KEY')
  if (column.isPrimaryKey) constraints.push('NOT NULL')
  if (/^(created_at|updated_at)$/.test(column.name)) {
    constraints.push('DEFAULT CURRENT_TIMESTAMP')
  }

  return [quoteIdentifier(column.name), sqlType(column.type), ...constraints].join(' ')
}

const toSnakeIdentifier = (value: string) => {
  const identifier = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  if (!identifier) return ''
  return /^[a-z_]/.test(identifier) ? identifier : `_${identifier}`
}

const toCamelIdentifier = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('')

const sqlType = (type: string) => (isIntegerType(type) ? 'INTEGER' : 'TEXT')

const isIntegerType = (type: string) =>
  /^(int|integer|number|real|float|double|boolean|bool)$/i.test(type)

const quoteIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`
