import type { WorkflowStep } from './types.js'

type WorkflowJson = {
  steps?: Array<{
    actor?: unknown
    screen?: unknown
    action?: unknown
  }>
}

export const parseWorkflowJson = (text: string): WorkflowStep[] => {
  const jsonText = extractJson(text)
  const parsed = JSON.parse(jsonText) as WorkflowJson
  const steps = parsed.steps ?? []

  return steps
    .map((step) => ({
      actor: String(step.actor ?? '').trim(),
      screen: normalizeScreen(step.screen),
      action: String(step.action ?? '').trim(),
    }))
    .filter((step) => step.actor && step.action)
}

const normalizeScreen = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/画面で$/, '')
    .replace(/画面$/, '')
    .replace(/で$/, '')

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
