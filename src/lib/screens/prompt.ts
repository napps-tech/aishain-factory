import type { DatabaseTable } from '../database/index.js'
import type { WorkflowStep } from '../workflow/index.js'

export const buildScreenPlanPrompt = (
  workflowSteps: WorkflowStep[],
  tables: DatabaseTable[] = [],
) => `
あなたは業務システムの画面設計者です。
次の画面単位の業務まとまりから、生成する画面と画面要素を洗い出してください。

制約:
- 画面は業務フローの1ステップごとに作らず、画面単位のまとまりごとに作ってください。
- 原則として、以下の「画面単位のまとまり」1つにつき1画面を作ってください。
- 「進捗確認」「受付確認」「状況確認」「一覧確認」のような確認系は、業務上同じ一覧・詳細画面で扱えるなら1画面に統合してください。
- 似た確認画面を分割せず、同じ画面の summary と elements に複数の業務を含めてください。
- 画面数は screen のまとまりに合わせ、不要に4画面以上へ水増ししないでください。
- name は短い日本語の画面名にしてください。
- name は統合後の screen 名と一致させるか、より自然な同義の画面名にしてください。
- elements は各画面に必要なUI要素です。
- type は "input" | "table" | "button" | "filter" | "detail" | "status" | "navigation" のいずれかを中心にしてください。
- 出力はJSONだけにしてください。
- Markdownや説明文は含めないでください。

JSON schema:
{
  "screens": [
    {
      "id": "inquiry_create",
      "name": "問い合わせ登録",
      "summary": "利用者が問い合わせ内容を登録する画面",
      "elements": [
        { "name": "件名", "type": "input", "description": "問い合わせの件名を入力する" },
        { "name": "登録", "type": "button", "description": "問い合わせを送信する" }
      ]
    }
  ]
}

画面単位のまとまり:
${formatScreenGroups(workflowSteps)}

テーブル設計:
${tables.map((table) => `- ${table.displayName ?? table.name} (${table.name}): ${table.description}`).join('\n') || 'なし'}
`.trim()

const formatScreen = (screen: string) => (screen ? `${screen}で` : '')

const formatScreenGroups = (workflowSteps: WorkflowStep[]) => {
  const groups = new Map<string, WorkflowStep[]>()

  workflowSteps.forEach((step) => {
    const screen = getScreenGroupName(step.screen)
    groups.set(screen, [...(groups.get(screen) ?? []), step])
  })

  return Array.from(groups.entries())
    .map(
      ([screen, steps]) =>
        `- ${screen}\n${steps
          .map((step) => `  - ${step.actor}が${formatScreen(step.screen)}${step.action}`)
          .join('\n')}`,
    )
    .join('\n')
}

const getScreenGroupName = (screen: string) => {
  if (!screen) return '未分類'

  if (/(進捗|受付|状況|一覧).*(確認|照会)?|確認|照会|一覧/.test(screen)) {
    return '一覧・確認'
  }

  return screen
}
