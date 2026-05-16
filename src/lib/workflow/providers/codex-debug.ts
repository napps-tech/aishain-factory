export type CodexWebSocketDebugEvent = {
  at: string
  direction: 'connect' | 'send' | 'receive' | 'error' | 'close'
  label: string
  detail: string
}

const maxEvents = 200
const events: CodexWebSocketDebugEvent[] = []

export const recordCodexWebSocketDebugEvent = (
  event: Omit<CodexWebSocketDebugEvent, 'at'>,
) => {
  events.push({
    ...event,
    at: new Date().toISOString(),
  })

  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents)
  }
}

export const listCodexWebSocketDebugEvents = () => [...events]

export const clearCodexWebSocketDebugEvents = () => {
  events.length = 0
}
