import type { DatabaseTable } from '../database/index.js'
import type { WorkflowStep } from '../workflow/index.js'

export type ScreenElement = {
  name: string
  type: string
  description: string
}

export type ScreenSpec = {
  id: string
  name: string
  summary: string
  elements: ScreenElement[]
}

export type ScreenPlanInput = {
  workflowSteps: WorkflowStep[]
  tables?: DatabaseTable[]
}

export type ScreenPlanResult = {
  screens: ScreenSpec[]
  source: string
}

export interface ScreenPlanner {
  plan(input: ScreenPlanInput): Promise<ScreenPlanResult>
}
