import type { ScreenSpec } from './types.js'

export const buildScreenImagePrompt = (screen: ScreenSpec) => `
次の内容で画像を生成してください。
生成した画像は、画像生成ツールの結果として返してください。

次の業務アプリ画面を、実際のWebアプリUIのスクリーンショット風画像として生成してください。

制約:
- メニューやヘッダーは不要です。画面本体のみを生成してください。
- 一覧と編集の両方が指定されている場合、一覧を左側に置き、編集機能は右サイドパネルに配置してください。

画面名:
${screen.name}

画面概要:
${screen.summary}

必要な画面要素:
${screen.elements.map((element) => `- ${element.name} (${element.type}): ${element.description}`).join('\n')}
`.trim()
