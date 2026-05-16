import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { Hono } from 'hono'
import WebSocket from 'ws'
import YAML from 'yaml'
import { createDatabaseDesigner } from './lib/database/index.js'
import {
  createBasePj,
  getBaseProjectStatus,
  getBaseProjectScreenRouteStatus,
  implementBaseProjectScreen,
  implementBaseProjectScreens,
} from './lib/development/base-project.js'
import {
  clearCodexWebSocketDebugEvents,
  listCodexWebSocketDebugEvents,
} from './lib/workflow/providers/codex-debug.js'
import {
  createScreenImage,
  createScreenImageGenerator,
  createScreenPlanner,
} from './lib/screens/index.js'
import { createWorkflowGenerator } from './lib/workflow/index.js'
import { page } from './ui/page.js'

const app = new Hono()
const port = Number(process.env.PORT ?? 8791)
const databaseDesigner = createDatabaseDesigner()
const screenImageGenerator = createScreenImageGenerator()
const screenPlanner = createScreenPlanner()
const workflowGenerator = createWorkflowGenerator()
const dataDirectory = new URL('../data/', import.meta.url)

app.use('/public/*', serveStatic({ root: './' }))
app.get('/', (c) => c.html(page()))

app.post('/api/workflows', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    projectText?: unknown
  }
  const projectText = String(body.projectText ?? '').trim()

  if (!projectText) {
    return c.json({ error: '作りたいシステムを入力してください' }, 400)
  }

  try {
    const workflow = await workflowGenerator.generate({ projectText })
    return c.json({ workflow })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '業務の流れを作成できませんでした',
      },
      500,
    )
  }
})

app.post('/api/database-designs', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    workflowSteps?: unknown
  }
  const workflowSteps = Array.isArray(body.workflowSteps)
    ? body.workflowSteps
        .map((step) => ({
          actor: String((step as { actor?: unknown }).actor ?? '').trim(),
          screen: normalizeScreen((step as { screen?: unknown }).screen),
          action: String((step as { action?: unknown }).action ?? '').trim(),
        }))
        .filter((step) => step.actor && step.action)
    : []

  if (workflowSteps.length === 0) {
    return c.json({ error: '業務の流れを入力してください' }, 400)
  }

  try {
    const databaseDesign = await databaseDesigner.design({ workflowSteps })
    return c.json({ databaseDesign })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'データベース設計を作成できませんでした',
      },
      500,
    )
  }
})

app.post('/api/screens', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    tables?: unknown
    workflowSteps?: unknown
  }
  const workflowSteps = normalizeWorkflowSteps(body.workflowSteps)
  const tables = Array.isArray(body.tables) ? body.tables : []

  if (workflowSteps.length === 0) {
    return c.json({ error: '業務の流れを入力してください' }, 400)
  }

  try {
    const screenPlan = await screenPlanner.plan({ workflowSteps, tables })
    return c.json({ screenPlan })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '画面一覧を作成できませんでした',
      },
      500,
    )
  }
})

app.post('/api/screen-images', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    screen?: {
      id?: unknown
      name?: unknown
      summary?: unknown
      elements?: unknown
    }
  }
  const screen = body.screen
  const elements = Array.isArray(screen?.elements)
    ? screen.elements
        .map((element) => ({
          name: String((element as { name?: unknown }).name ?? '').trim(),
          type: String((element as { type?: unknown }).type ?? 'detail').trim(),
          description: String(
            (element as { description?: unknown }).description ?? '',
          ).trim(),
        }))
        .filter((element) => element.name)
    : []

  if (!screen?.name || elements.length === 0) {
    return c.json({ error: '画面情報を入力してください' }, 400)
  }

  const screenSpec = {
        id: String(screen.id ?? screen.name),
        name: String(screen.name),
        summary: String(screen.summary ?? ''),
        elements,
      }

  try {
    return c.json({
      image: {
        imageSrc: await screenImageGenerator.generate(screenSpec),
        source: 'codex-imagegen',
      },
    })
  } catch (error) {
    return c.json({
      image: {
        imageSrc: createScreenImage(screenSpec),
        fallbackReason:
          error instanceof Error ? error.message : '画像生成に失敗しました',
        source: 'svg-fallback',
      },
    })
  }
})

app.get('/api/drafts', async (c) => {
  try {
    const filenames = (await readdir(dataDirectory))
      .filter((filename) => isSafeDraftFilename(filename))
      .sort()
      .reverse()

    const drafts = await Promise.all(
      filenames.map(async (filename) => {
        const text = await readFile(new URL(filename, dataDirectory), 'utf8')
        const draft = YAML.parse(text) as {
          projectText?: unknown
          savedAt?: unknown
        }
        return {
          filename,
          projectText: String(draft.projectText ?? '').trim(),
          savedAt: String(draft.savedAt ?? ''),
        }
      }),
    )

    return c.json({ drafts: drafts.filter((draft) => draft.projectText) })
  } catch {
    return c.json({ drafts: [] })
  }
})

app.get('/api/drafts/:filename', async (c) => {
  const filename = c.req.param('filename')
  if (!isSafeDraftFilename(filename)) {
    return c.json({ error: '読み込めない途中保存ファイルです' }, 400)
  }

  try {
    const text = await readFile(new URL(filename, dataDirectory), 'utf8')
    return c.json({ draft: YAML.parse(text) })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '途中保存ファイルを読み込めませんでした',
      },
      404,
    )
  }
})

app.get('/api/codex-debug', (c) =>
  c.json({ events: listCodexWebSocketDebugEvents() }),
)

app.delete('/api/codex-debug', (c) => {
  clearCodexWebSocketDebugEvents()
  return c.json({ ok: true })
})

app.get('/api/codex-server-status', async (c) => {
  const url = process.env.CODEX_SERVER_WS_URL ?? 'ws://127.0.0.1:8080'
  const status = await checkCodexServerStatus(url)
  return c.json(status, status.ok ? 200 : 503)
})

app.post('/api/drafts', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const savedAt = new Date().toISOString()
  const projectText = String(body.projectText ?? '').trim()
  const draft = {
    savedAt,
    projectText,
    workflowSteps: normalizeWorkflowSteps(body.workflowSteps),
    databaseDesign: body.databaseDesign ?? null,
    screens: Array.isArray(body.screens) ? body.screens : [],
    development:
      typeof body.development === 'object' && body.development !== null
        ? body.development
        : null,
  }
  const requestedFilename =
    typeof body.filename === 'string' ? body.filename : undefined
  const filename =
    requestedFilename && isSafeDraftFilename(requestedFilename)
      ? requestedFilename
      : `draft-${savedAt.replace(/[:.]/g, '-')}.yaml`

  try {
    await mkdir(dataDirectory, { recursive: true })
    await writeFile(
      new URL(filename, dataDirectory),
      YAML.stringify(draft, { lineWidth: 0 }),
      'utf8',
    )
    return c.json({ filename, path: `data/${filename}` })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error ? error.message : '途中保存に失敗しました',
      },
      500,
    )
  }
})

app.post('/api/base-projects', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    projectText?: unknown
    tables?: unknown
    screens?: unknown
  }
  const projectText = String(body.projectText ?? '').trim()
  const tables = normalizeDatabaseTables(body.tables)
  const screens = normalizeScreens(body.screens)

  try {
    const project = await createBasePj({ projectText, tables, screens })
    return c.json({ project }, 201)
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'ベースプロジェクトを生成できませんでした',
      },
      500,
    )
  }
})

app.post('/api/base-projects/:id/screens/:screenId', async (c) => {
  const id = c.req.param('id')
  const screenId = c.req.param('screenId')
  const body = (await c.req.json().catch(() => ({}))) as {
    screen?: unknown
  }
  const [screen] = normalizeScreens([
    {
      ...(typeof body.screen === 'object' && body.screen !== null
        ? body.screen
        : {}),
      id: screenId,
    },
  ])

  if (!screen) {
    return c.json({ error: '画面仕様を入力してください' }, 400)
  }

  try {
    const implementedScreen = await implementBaseProjectScreen(id, screen)
    return c.json({ screen: implementedScreen })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '画面を実装できませんでした',
      },
      500,
    )
  }
})

app.get('/api/base-projects/:id/status', async (c) => {
  const id = c.req.param('id')

  try {
    const status = await getBaseProjectStatus(id)
    return c.json({ status })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '生成プロジェクトの状態を確認できませんでした',
      },
      500,
    )
  }
})

app.get('/api/base-projects/:id/screens/:screenId/file-status', async (c) => {
  const id = c.req.param('id')
  const screenId = c.req.param('screenId')

  try {
    const status = await getBaseProjectScreenRouteStatus(id, screenId)
    return c.json({ status })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '画面ファイルの状態を確認できませんでした',
      },
      500,
    )
  }
})

app.post('/api/base-projects/:id/screens', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as {
    screens?: unknown
  }
  const screens = normalizeScreens(body.screens)

  if (screens.length === 0) {
    return c.json({ error: '画面仕様を入力してください' }, 400)
  }

  try {
    const implementedScreens = await implementBaseProjectScreens(id, screens)
    return c.json({ screens: implementedScreens })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '画面を実装できませんでした',
      },
      500,
    )
  }
})

serve({
  fetch: app.fetch,
  port,
})

console.log(`Aishain Factory listening on http://localhost:${port}`)

const normalizeWorkflowSteps = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((step) => ({
          actor: String((step as { actor?: unknown }).actor ?? '').trim(),
          screen: normalizeScreen((step as { screen?: unknown }).screen),
          action: String((step as { action?: unknown }).action ?? '').trim(),
        }))
        .filter((step) => step.actor && step.action)
    : []

const normalizeDatabaseTables = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((table) => ({
          name: String((table as { name?: unknown }).name ?? '').trim(),
          displayName: String(
            (table as { displayName?: unknown }).displayName ?? '',
          ).trim(),
          description: String(
            (table as { description?: unknown }).description ?? '',
          ).trim(),
          columns: normalizeDatabaseColumns(
            (table as { columns?: unknown }).columns,
          ),
        }))
      .filter((table) => table.name && table.columns.length > 0)
    : []

const normalizeScreens = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((screen) => ({
          id: String((screen as { id?: unknown }).id ?? '').trim(),
          name: String((screen as { name?: unknown }).name ?? '').trim(),
          summary: String((screen as { summary?: unknown }).summary ?? '').trim(),
          imageSrc: String((screen as { imageSrc?: unknown }).imageSrc ?? '').trim() || undefined,
          elements: Array.isArray((screen as { elements?: unknown }).elements)
            ? ((screen as { elements?: unknown }).elements as unknown[])
                .map((element) => ({
                  name: String((element as { name?: unknown }).name ?? '').trim(),
                  type: String((element as { type?: unknown }).type ?? 'detail').trim(),
                  description: String(
                    (element as { description?: unknown }).description ?? '',
                  ).trim(),
                }))
                .filter((element) => element.name)
            : [],
        }))
        .filter((screen) => screen.id && screen.name)
    : []

const normalizeDatabaseColumns = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((column) => ({
          name: String((column as { name?: unknown }).name ?? '').trim(),
          type: String((column as { type?: unknown }).type ?? 'text').trim(),
          description: String(
            (column as { description?: unknown }).description ?? '',
          ).trim(),
          isPrimaryKey: Boolean(
            (column as { isPrimaryKey?: unknown }).isPrimaryKey,
          ),
          references:
            typeof (column as { references?: unknown }).references === 'string'
              ? String((column as { references?: unknown }).references).trim()
              : undefined,
        }))
        .filter((column) => column.name)
    : []

const normalizeScreen = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/画面で$/, '')
    .replace(/画面$/, '')
    .replace(/で$/, '')

const isSafeDraftFilename = (filename: string) =>
  filename === basename(filename) && /^draft-[\w.-]+\.ya?ml$/.test(filename)

const checkCodexServerStatus = (url: string) =>
  new Promise<{ ok: boolean; url: string; error?: string }>((resolve) => {
    const socket = new WebSocket(url)
    const timeout = setTimeout(() => {
      socket.close()
      resolve({
        ok: false,
        url,
        error: 'codex-serverへの接続がタイムアウトしました',
      })
    }, 1000)

    socket.once('open', () => {
      clearTimeout(timeout)
      socket.close()
      resolve({ ok: true, url })
    })

    socket.once('error', (error) => {
      clearTimeout(timeout)
      resolve({ ok: false, url, error: error.message })
    })
  })
