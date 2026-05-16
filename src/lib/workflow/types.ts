export type WorkflowStep = {
  actor: string
  screen: string
  action: string
}

export type WorkflowGenerationInput = {
  projectText: string
}

export type WorkflowGenerationResult = {
  steps: WorkflowStep[]
  source: string
}

export interface WorkflowGenerator {
  generate(input: WorkflowGenerationInput): Promise<WorkflowGenerationResult>
}
