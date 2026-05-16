import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { DatabaseTable } from '../database/index.js'
import type { ScreenSpec } from '../screens/index.js'
import { CodexJsonRpcClient } from '../workflow/providers/codex-json-rpc.js'
import {
  createDrizzleSchema,
  createMigration,
  normalizeTables,
} from './database-project.js'

export type BaseProject = {
  id: string
  path: string
  relativePath: string
  files: string[]
  commands: string[]
}

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

export type BaseProjectInput = {
  projectText?: string
  tables?: DatabaseTable[]
  screens?: DevelopmentScreen[]
}

export type DevelopmentScreen = ScreenSpec & {
  imageSrc?: string
}

type ProjectScreenLink = {
  id: string
  name: string
  routePath: string
}

export const createBasePj = async (
  input: BaseProjectInput = {},
): Promise<BaseProject> => {
  const root = join(projectRoot, 'gen_src')
  await mkdir(root, { recursive: true })

  const id = randomId()
  const projectPath = join(root, id)
  const tables = normalizeTables(input.tables)

  await mkdir(join(projectPath, 'src'), { recursive: true })
  await mkdir(join(projectPath, 'public'), { recursive: true })
  await mkdir(join(projectPath, 'public', 'assets'), { recursive: true })
  await mkdir(join(projectPath, 'public', 'screens'), { recursive: true })

  const screenLinks = createProjectScreenLinks(input.screens ?? [])
  const applicationName = createApplicationName(input.projectText ?? '')
  const files = baseProjectFiles(id, tables, screenLinks, applicationName)

  await Promise.all(
    files.map(async (file) => {
      const filePath = join(projectPath, file.path)
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, file.content, 'utf8')
    }),
  )
  await copyBundledAsset('nappy.png', join(projectPath, 'public', 'assets', 'nappy.png'))

  return {
    id,
    path: projectPath,
    relativePath: relative(projectRoot, projectPath),
    files: files.map((file) => file.path),
    commands: [
      `cd ${relative(projectRoot, projectPath)}`,
      'pnpm install',
      'cp .env.example .env',
      'pnpm db:migrate',
      'pnpm build:css',
      'pnpm dev',
    ],
  }
}

export const implementBaseProjectScreen = async (
  projectId: string,
  screen: DevelopmentScreen,
) => {
  if (!isSafeProjectId(projectId)) {
    throw new Error('生成プロジェクトまたは画面IDが不正です')
  }

  const projectPath = join(projectRoot, 'gen_src', projectId)
  const preparedScreen = await prepareScreen(projectPath, screen)
  await implementScreen(projectPath, preparedScreen)

  return {
    id: preparedScreen.id,
    name: preparedScreen.name,
    routePath: preparedScreen.routePath,
    assetFile: preparedScreen.assetFile,
    status: 'codex-serverで生成済み',
  }
}

export const implementBaseProjectScreens = async (
  projectId: string,
  screens: DevelopmentScreen[],
) => {
  if (!isSafeProjectId(projectId)) {
    throw new Error('生成プロジェクトIDが不正です')
  }

  const projectPath = join(projectRoot, 'gen_src', projectId)
  const preparedScreens = []
  for (const screen of screens) {
    preparedScreens.push(await prepareScreen(projectPath, screen))
  }

  const client = new CodexJsonRpcClient({
    cwd: projectPath,
    debugLabel: 'development/batch',
    timeoutMs: Number(process.env.CODEX_DEVELOPMENT_TIMEOUT_MS ?? 600_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })

  try {
    const implementedScreens = []
    for (const screen of preparedScreens) {
      client.setDebugLabel(`development/${screen.id}`)
      await client.generateText(buildDevelopmentPrompt(screen))
      implementedScreens.push({
        id: screen.id,
        name: screen.name,
        routePath: screen.routePath,
        assetFile: screen.assetFile,
        status: 'codex-serverで生成済み',
      })
    }

    return implementedScreens
  } finally {
    client.close()
  }
}

export const getBaseProjectScreenRouteStatus = async (
  projectId: string,
  screenId: string,
) => {
  if (!isSafeProjectId(projectId)) {
    throw new Error('生成プロジェクトIDが不正です')
  }

  const routeId = toKebabIdentifier(screenId) || 'screen'
  const relativePath = `src/routes/${routeId}.ts`
  const filePath = join(projectRoot, 'gen_src', projectId, relativePath)

  try {
    const file = await stat(filePath)
    return {
      exists: file.isFile(),
      relativePath,
      routePath: `/screens/${routeId}`,
    }
  } catch {
    return {
      exists: false,
      relativePath,
      routePath: `/screens/${routeId}`,
    }
  }
}

export const getBaseProjectStatus = async (projectId: string) => {
  if (!isSafeProjectId(projectId)) {
    throw new Error('生成プロジェクトIDが不正です')
  }

  const relativePath = join('gen_src', projectId)
  const projectPath = join(projectRoot, relativePath)

  try {
    const project = await stat(projectPath)
    return {
      exists: project.isDirectory(),
      relativePath,
    }
  } catch {
    return {
      exists: false,
      relativePath,
    }
  }
}

const isSafeProjectId = (value: string) => /^[a-f0-9]{12}$/.test(value)

const randomId = () => randomBytes(6).toString('hex')

const createProjectScreenLinks = (screens: DevelopmentScreen[]) => {
  const usedIds = new Set<string>()
  return screens.map((screen, index) => {
    const baseId = toKebabIdentifier(screen.id || screen.name) || `screen-${index + 1}`
    const id = uniqueId(baseId, usedIds)
    return {
      id,
      name: screen.name,
      routePath: `/screens/${id}`,
    }
  })
}

const createApplicationName = (projectText: string) => {
  const normalized = projectText.replace(/\s+/g, '')
  const keywordNames: Array<[RegExp, string]> = [
    [/問い合わせ|問合せ|問合わせ/, '問い合わせ管理'],
    [/予約/, '予約管理'],
    [/在庫/, '在庫管理'],
    [/勤怠/, '勤怠管理'],
    [/請求/, '請求管理'],
    [/顧客/, '顧客管理'],
  ]
  const keywordName = keywordNames.find(([pattern]) => pattern.test(normalized))?.[1]
  if (keywordName) return `${keywordName}シャイン`

  const baseName = normalized
    .replace(/(システム|アプリ|業務|作りたい|つくりたい|管理する|登録する|確認する|できる|する)$/g, '')
    .slice(0, 14)

  return `${baseName || '理想の'}シャイン`
}

const copyBundledAsset = async (fileName: string, destination: string) => {
  await copyFile(join(projectRoot, 'public', 'assets', fileName), destination)
}

const baseProjectFiles = (
  id: string,
  tables: DatabaseTable[],
  screens: ProjectScreenLink[],
  applicationName: string,
) => [
  {
    path: 'package.json',
    content: `${JSON.stringify(
      {
        name: `generated-hono-tailwind-${id}`,
        private: true,
        type: 'module',
        scripts: {
          'build:css': 'tailwindcss -i ./src/styles.css -o ./public/styles.css',
          dev: 'concurrently "tailwindcss -i ./src/styles.css -o ./public/styles.css --watch" "tsx watch src/server.ts"',
          'db:generate': 'drizzle-kit generate',
          'db:migrate': 'tsx src/db/migrate.ts',
          start: 'pnpm build:css && tsx src/server.ts',
          'type-check': 'tsc --noEmit',
        },
        dependencies: {
          '@libsql/client': '^0.15.15',
          '@hono/node-server': '^1.19.6',
          'drizzle-orm': '^0.45.1',
          hono: '^4.10.6',
        },
        devDependencies: {
          '@tailwindcss/cli': '^4.3.0',
          '@types/node': '^24.10.1',
          concurrently: '^9.2.1',
          'drizzle-kit': '^0.31.7',
          tailwindcss: '^4.3.0',
          tsx: '^4.20.6',
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    )}\n`,
  },
  {
    path: 'tsconfig.json',
    content: `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          types: ['node'],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  },
  {
    path: 'drizzle.config.ts',
    content: `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
`,
  },
  {
    path: '.env.example',
    content: `# Local development uses an on-disk libSQL database.
TURSO_DATABASE_URL=file:local.db

# For Turso, set these values from:
# turso db show <database-name> --url
# turso db tokens create <database-name>
# TURSO_DATABASE_URL=libsql://your-database.turso.io
# TURSO_AUTH_TOKEN=your-token
`,
  },
  {
    path: 'README.md',
    content: generatedReadme(),
  },
  {
    path: 'src/db/client.ts',
    content: `import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(turso)
`,
  },
  {
    path: 'src/db/schema.ts',
    content: createDrizzleSchema(tables),
  },
  {
    path: 'src/db/migrate.ts',
    content: `import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { turso } from './client.js'

const migrationsDir = new URL('../../drizzle/', import.meta.url)

const run = async () => {
  const entries = await readdir(migrationsDir)
  const sqlFiles = entries.filter((entry) => entry.endsWith('.sql')).sort()

  for (const sqlFile of sqlFiles) {
    const sql = await readFile(join(fileURLToPath(migrationsDir), sqlFile), 'utf8')
    await turso.executeMultiple(sql)
    console.log(\`Applied \${sqlFile}\`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
`,
  },
  {
    path: 'drizzle/0000_initial.sql',
    content: createMigration(tables),
  },
  {
    path: 'src/server.ts',
    content: `import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { turso } from './db/client.js'
import { renderHome, renderNotFound, renderPage } from './ui.js'

const app = new Hono()
const port = Number(process.env.PORT ?? 3000)

app.use('/public/*', serveStatic({ root: './' }))

app.get('/health/db', async (c) => {
  await turso.execute('select 1')
  return c.json({ ok: true })
})

app.get('/', (c) => c.html(renderPage(renderHome())))

app.notFound((c) => c.html(renderPage(renderNotFound(c.req.path)), 404))

serve({
  fetch: app.fetch,
  port,
})

console.log(\`Generated app listening on http://localhost:\${port}\`)
`,
  },
  {
    path: 'src/ui.ts',
    content: `const applicationName = ${JSON.stringify(applicationName)}

export const renderPage = (content: string) => \`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>\${escapeHtml(applicationName)}</title>
    <link rel="stylesheet" href="/public/styles.css" />
  </head>
  <body class="m-0 min-h-screen bg-slate-50 text-slate-950 antialiased">
    <main class="mx-auto grid w-[min(100%-32px,1120px)] gap-6 py-8 max-md:w-[min(100%-22px,640px)] max-md:py-5">
      \${content}
    </main>
  </body>
</html>\`

export const renderHome = () => \`
  <section class="grid items-center gap-6 rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/10 md:grid-cols-[1fr_220px] max-md:p-5">
    <div class="grid gap-3">
      <p class="m-0 text-xs font-extrabold uppercase tracking-wide text-teal-700">AIシャイン</p>
      <h1 class="m-0 text-[clamp(2rem,5vw,3.6rem)] font-black leading-tight">\${escapeHtml(applicationName)}</h1>
    </div>
    <div class="grid justify-items-start">
      <img class="h-auto w-full max-w-[180px]" src="/public/assets/nappy.png" alt="ナッピー" />
    </div>
  </section>
  \${renderPlannedScreens()}
\`

const plannedScreens: Array<{ id: string; name: string; routePath: string }> = ${JSON.stringify(screens, null, 2)}

const renderPlannedScreens = () =>
  plannedScreens.length === 0
    ? ''
    : \`<nav class="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10" aria-label="画面メニュー">
        <h2 class="m-0 text-lg font-black leading-tight">メニュー</h2>
        <div class="grid gap-2 sm:grid-cols-2">
          \${plannedScreens
            .map(
              (screen) =>
                \`<a class="flex min-h-12 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 font-extrabold text-slate-950 no-underline transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white hover:shadow-md" href="\${escapeHtml(screen.routePath)}">\${escapeHtml(screen.name)}</a>\`,
            )
            .join('')}
        </div>
      </nav>\`

export const renderNotFound = (path: string) => \`
  <section class="grid gap-4 rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/10 max-md:p-5">
    <p class="m-0 text-xs font-extrabold uppercase tracking-wide text-rose-700">404</p>
    <h1 class="m-0 text-[clamp(2rem,5vw,3.2rem)] font-black leading-tight">ページがまだありません</h1>
    <p class="m-0 max-w-3xl leading-7 text-slate-600">
      \${escapeHtml(path)} はまだ実装されていないか、URLが違います。
    </p>
    \${renderPlannedScreens()}
    <p class="m-0">
      <a class="inline-grid min-h-11 place-items-center rounded-lg bg-teal-700 px-4 font-extrabold text-white no-underline transition hover:bg-teal-800" href="/">トップへ戻る</a>
    </p>
  </section>
\`

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
`,
  },
  {
    path: 'src/styles.css',
    content: `@import "tailwindcss";
@source "./src/**/*.ts";
`,
  },
  {
    path: 'public/styles.css',
    content: `/*! Generated by pnpm build:css. Run pnpm install && pnpm build:css before serving. */
`,
  },
  {
    path: '.gitignore',
    content: `node_modules
dist
.env
local.db
local.db-*
`,
  },
]

const generatedReadme = () => `# Generated Hono + Tailwind + Turso + Drizzle app

## Setup

\`\`\`sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
\`\`\`

The default \`.env\` uses \`file:local.db\` so you can run the app locally without a Turso account.

## Turso migration

Create or choose a Turso database, then set these variables in \`.env\`.

\`\`\`sh
turso db show <database-name> --url
turso db tokens create <database-name>
\`\`\`

\`\`\`env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
\`\`\`

Apply the generated migration to Turso.

\`\`\`sh
pnpm db:migrate
\`\`\`

## Regenerate migrations from the DB definition

Edit \`src/db/schema.ts\`, then run:

\`\`\`sh
pnpm db:generate
pnpm db:migrate
\`\`\`

## Screens

Screens are implemented one by one by the development tool. Each request tells Codex which URL to create.
`

type PreparedScreen = DevelopmentScreen & {
  routePath: string
  assetFile?: string
}

const implementScreen = async (
  projectPath: string,
  screen: PreparedScreen,
) => {
  const client = new CodexJsonRpcClient({
    cwd: projectPath,
    debugLabel: `development/${screen.id}`,
    timeoutMs: Number(process.env.CODEX_DEVELOPMENT_TIMEOUT_MS ?? 600_000),
    url: process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080',
  })

  try {
    await client.generateText(buildDevelopmentPrompt(screen))
  } finally {
    client.close()
  }
}

const prepareScreen = async (
  projectPath: string,
  screen: DevelopmentScreen,
): Promise<PreparedScreen> => {
  const id = toKebabIdentifier(screen.id || screen.name) || 'screen'
  const preparedScreen = {
    ...screen,
    id,
    routePath: `/screens/${id}`,
  }
  const assetFile = await writeScreenAsset(projectPath, preparedScreen)
  return {
    ...preparedScreen,
    imageSrc: assetFile ? `/public/screens/${assetFile.split('/').pop()}` : undefined,
    assetFile,
  }
}

const writeScreenAsset = async (
  projectPath: string,
  screen: PreparedScreen,
): Promise<string | undefined> => {
  if (!screen.imageSrc) return undefined

  const extension = imageExtension(screen.imageSrc)
  const assetFile = `public/screens/${screen.id}${extension}`
  const destination = join(projectPath, assetFile)

  if (screen.imageSrc.startsWith('data:image/')) {
    const [, payload] = screen.imageSrc.split(',')
    if (!payload) return undefined
    await writeFile(destination, Buffer.from(payload, 'base64'))
    return assetFile
  }

  const sourcePath = localPublicImagePath(screen.imageSrc)
  if (!sourcePath) return undefined

  await copyFile(sourcePath, destination)
  return assetFile
}

const localPublicImagePath = (imageSrc: string) => {
  try {
    const url = new URL(imageSrc, 'http://localhost')
    if (!url.pathname.startsWith('/public/generated/')) return undefined
    return join(projectRoot, url.pathname.replace(/^\/public\//, 'public/'))
  } catch {
    return undefined
  }
}

const imageExtension = (imageSrc: string) => {
  if (imageSrc.startsWith('data:image/png')) return '.png'
  if (imageSrc.startsWith('data:image/jpeg')) return '.jpg'
  if (imageSrc.startsWith('data:image/webp')) return '.webp'
  if (imageSrc.startsWith('data:image/svg+xml')) return '.svg'

  try {
    const pathExtension = extname(new URL(imageSrc, 'http://localhost').pathname)
    return pathExtension || '.png'
  } catch {
    return '.png'
  }
}

const buildDevelopmentPrompt = (
  screen: PreparedScreen,
) => `
下記の画面を実装してください。
- 作成先URLは ${screen.routePath} です。このURLで画面を開けるようにしてください。
- src/routes/${screen.id}.ts に実装してください。
- 編集機能はサイドパネルで実装します。
- 必要なら src/server.ts に route 登録だけ追加してください。
- 既存の Hono + Tailwind + Turso + Drizzle 構成に合わせてください。
- DBは必要に応じて src/db/schema.ts を見て実装してください。
- 画面仕様を見て、実際に操作できる業務画面として実装してください。
- 開発サーバは起動しないでください。pnpm dev、pnpm start、tsx watch などのサーバ起動コマンドは実行不要です。
- 編集後の返答は、作成/編集したファイル一覧と画面URLだけを短くJSONで返してください。

画面仕様:
${JSON.stringify(
  {
    id: screen.id,
    name: screen.name,
    summary: screen.summary,
    imageSrc: screen.imageSrc,
    imageFile: screen.assetFile,
    routePath: screen.routePath,
    elements: screen.elements,
  },
  null,
  2,
)}
`.trim()

const toKebabIdentifier = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const uniqueId = (baseId: string, usedIds: Set<string>) => {
  let id = baseId
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}
