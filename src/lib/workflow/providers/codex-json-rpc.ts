import WebSocket from 'ws'
import { publishGeneratedImage } from '../../codex/image-files.js'
import { recordCodexWebSocketDebugEvent } from './codex-debug.js'

type JsonRpcMessage = {
  id?: number | string
  method?: string
  params?: unknown
  result?: unknown
  error?: {
    message?: string
  }
}

type PendingRequest = {
  method: string
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

type TextInput = {
  type: 'text'
  text: string
  text_elements: []
}

type CodexJsonRpcClientOptions = {
  cwd: string
  debugLabel?: string
  timeoutMs?: number
  url: string
}

export class CodexJsonRpcClient {
  private initialized: Promise<void> | undefined
  private nextRequestId = 1
  private pendingRequests = new Map<number | string, PendingRequest>()
  private socket: WebSocket | undefined
  private socketReady: Promise<WebSocket> | undefined
  private threadId: string | undefined

  constructor(private readonly options: CodexJsonRpcClientOptions) {}

  setDebugLabel(debugLabel: string) {
    this.options.debugLabel = debugLabel
  }

  async generateText(prompt: string) {
    const collected: string[] = []
    let completed = false
    let rejectCompletion: ((error: Error) => void) | undefined

    const completion = new Promise<void>((resolve, reject) => {
      rejectCompletion = reject
      const timeout = setTimeout(() => {
        reject(new Error('Codex server response timed out'))
      }, this.options.timeoutMs ?? 120_000)

      this.onNotification = (message) => {
        this.debugMessage('receive', message)
        const params = asRecord(message.params)

        if (message.method === 'item/completed') {
          const item = asRecord(params?.item)
          if (item?.type === 'agentMessage' && typeof item.text === 'string') {
            collected.push(item.text)
          }
        }

        if (message.method === 'turn/completed') {
          completed = true
          clearTimeout(timeout)
          resolve()
        }
      }
    })

    try {
      await this.startTurn([{ type: 'text', text: prompt, text_elements: [] }])
      await completion
    } catch (error) {
      rejectCompletion?.(error instanceof Error ? error : new Error(String(error)))
      await completion.catch(() => undefined)
      throw error
    } finally {
      this.onNotification = undefined
    }

    if (!completed || collected.length === 0) {
      throw new Error('Codex server did not return an assistant message')
    }

    return collected.join('\n').trim()
  }

  async generateImage(prompt: string) {
    const images: string[] = []
    let completed = false
    let rejectCompletion: ((error: Error) => void) | undefined

    const completion = new Promise<void>((resolve, reject) => {
      rejectCompletion = reject
      const timeout = setTimeout(() => {
        reject(new Error('Codex server image response timed out'))
      }, this.options.timeoutMs ?? 120_000)

      this.onNotification = (message) => {
        this.debugMessage('receive', message)
        const params = asRecord(message.params)

        if (message.method === 'item/completed') {
          const item = asRecord(params?.item)
          if (item?.type === 'imageGeneration') {
            const image = getImageResult(item)
            if (image) images.push(image)
          }
        }

        if (message.method === 'rawResponseItem/completed') {
          const item = asRecord(params?.item)
          if (item?.type === 'image_generation_call') {
            const image = getImageResult(item)
            if (image) images.push(image)
          }
        }

        if (message.method === 'turn/completed') {
          completed = true
          clearTimeout(timeout)
          resolve()
        }
      }
    })

    try {
      await this.startTurn([{ type: 'text', text: prompt, text_elements: [] }])
      await completion
    } catch (error) {
      rejectCompletion?.(error instanceof Error ? error : new Error(String(error)))
      await completion.catch(() => undefined)
      throw error
    } finally {
      this.onNotification = undefined
    }

    if (!completed || images.length === 0) {
      throw new Error('Codex server did not return an image')
    }

    return normalizeImageSrc(images[images.length - 1])
  }

  close() {
    this.socket?.close()
  }

  private onNotification: ((message: JsonRpcMessage) => void) | undefined

  private async startTurn(input: TextInput[]) {
    const threadId = await this.ensureThread()

    await this.request('turn/start', {
      threadId,
      input,
      cwd: this.options.cwd,
    })
  }

  private async ensureThread() {
    await this.ensureInitialized()
    if (this.threadId) return this.threadId

    const result = await this.request('thread/start', {
      cwd: this.options.cwd,
      ephemeral: true,
      threadSource: 'user',
    })

    const threadId = getThreadId(result)
    if (!threadId) {
      throw new Error('thread/start response did not include thread.id')
    }

    this.threadId = threadId
    return threadId
  }

  private async ensureInitialized() {
    await this.connect()

    this.initialized ??= this.request('initialize', {
      clientInfo: {
        name: 'aishain-factory',
        title: 'Aishain Factory',
        version: '0.1.0',
      },
      capabilities: {
        experimentalApi: true,
      },
    }).then(() => undefined)

    await this.initialized
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.socket)
    }

    if (this.socketReady) return this.socketReady

    this.socket = new WebSocket(this.options.url)
    this.debug('connect', 'open', `${this.options.url} cwd=${this.options.cwd}`)
    this.socketReady = new Promise<WebSocket>((resolve, reject) => {
      const socket = this.socket
      if (!socket) {
        reject(new Error('Codex server connection was not created'))
        return
      }

      socket.on('open', () => {
        this.debug('connect', 'opened', this.options.url)
        resolve(socket)
      })

      socket.on('message', (chunk) => {
        this.handleSocketMessage(socket, chunk)
      })

      socket.on('error', (error) => {
        this.socketReady = undefined
        this.debug('error', 'socket/error', error.message)
        reject(error)
      })

      socket.on('close', (code, reason) => {
        const suffix = reason.length > 0 ? ` ${reason.toString('utf8')}` : ''
        this.debug('close', 'socket/close', `${code}${suffix}`)
        this.socketReady = undefined
        this.initialized = undefined
        this.threadId = undefined
        this.pendingRequests.forEach((pending) => {
          pending.reject(new Error(`Codex server closed: ${code}${suffix}`))
        })
        this.pendingRequests.clear()
      })
    })

    return this.socketReady
  }

  private request(method: string, params: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Codex server is not open'))
    }

    const id = this.nextRequestId++
    const payload = {
      jsonrpc: '2.0' as const,
      id,
      method,
      params,
    }

    this.debugMessage('send', payload)
    this.socket.send(JSON.stringify(payload))

    return new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(id, { method, resolve, reject })
    })
  }

  private handleSocketMessage(socket: WebSocket, chunk: WebSocket.RawData) {
    const message = parseMessage(chunk)
    if (!message) {
      this.debug('error', 'parse', 'WebSocket message was not valid JSON')
      return
    }

    if (message.method && message.id !== undefined) {
      this.debugMessage('receive', message)
      socket.send(
        JSON.stringify({
          jsonrpc: '2.0' as const,
          id: message.id,
          error: {
            code: -32601,
            message: `No handler for ${message.method}`,
          },
        }),
      )
      this.debug('send', 'rpc/error', `No handler for ${message.method}`)
      return
    }

    if (message.method) {
      this.onNotification?.(message)
      return
    }

    if (message.id === undefined) return

    this.debugMessage('receive', message)
    const pending = this.pendingRequests.get(message.id)
    if (!pending) {
      this.debug('error', 'rpc/orphan-response', `id=${String(message.id)}`)
      return
    }

    this.pendingRequests.delete(message.id)

    if (message.error) {
      pending.reject(
        new Error(message.error.message ?? `Request failed: ${pending.method}`),
      )
      return
    }

    pending.resolve(message.result)
  }

  private debugMessage(
    direction: 'send' | 'receive',
    message: JsonRpcMessage & { jsonrpc?: string },
  ) {
    const detail = summarizeMessage(message)
    if (!detail) return

    const label = message.method
      ? `${message.method}${message.id !== undefined ? ` #${String(message.id)}` : ''}`
      : message.id !== undefined
        ? `response #${String(message.id)}`
        : 'message'

    this.debug(direction, label, detail)
  }

  private debug(
    direction: 'connect' | 'send' | 'receive' | 'error' | 'close',
    label: string,
    detail: string,
  ) {
    recordCodexWebSocketDebugEvent({
      direction,
      label: this.options.debugLabel ? `${this.options.debugLabel}: ${label}` : label,
      detail,
    })
  }
}

const parseMessage = (chunk: WebSocket.RawData): JsonRpcMessage | undefined => {
  const text = Array.isArray(chunk)
    ? Buffer.concat(chunk).toString('utf8')
    : Buffer.isBuffer(chunk)
      ? chunk.toString('utf8')
      : chunk.toString()

  try {
    return JSON.parse(text) as JsonRpcMessage
  } catch {
    return undefined
  }
}

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

const getImageResult = (item: Record<string, unknown>) => {
  const result = item.result
  const savedPath = item.savedPath ?? item.saved_path
  if (typeof result !== 'string' || !result) return undefined

  const published = publishGeneratedImage(
    result,
    typeof savedPath === 'string' ? savedPath : undefined,
  )

  return published ?? result
}

const normalizeImageSrc = (result: string) => {
  if (
    result.startsWith('data:') ||
    result.startsWith('http://') ||
    result.startsWith('https://') ||
    result.startsWith('/')
  ) {
    return result
  }

  return `data:image/png;base64,${result}`
}

const getThreadId = (result: unknown): string | undefined => {
  const thread = asRecord(result)?.thread
  const id = asRecord(thread)?.id
  return typeof id === 'string' ? id : undefined
}

const summarizeMessage = (message: JsonRpcMessage & { jsonrpc?: string }) => {
  if (message.error) {
    return `error=${message.error.message ?? 'unknown error'}`
  }

  if (message.method === 'turn/start') {
    const params = asRecord(message.params)
    const input = Array.isArray(params?.input) ? params.input : []
    const firstText = asRecord(input[0])?.text
    return `cwd=${String(params?.cwd ?? '')} prompt=${shorten(String(firstText ?? ''))}`
  }

  if (message.method === 'item/completed' || message.method === 'rawResponseItem/completed') {
    const item = asRecord(asRecord(message.params)?.item)
    if (typeof item?.text === 'string' && item.text.trim()) {
      return shorten(item.text)
    }
    return undefined
  }

  if (message.result !== undefined) {
    return typeof message.result === 'string' && message.result.trim()
      ? shorten(message.result)
      : undefined
  }

  return undefined
}

const shorten = (value: string, maxLength = 240) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
