/** @jsxImportSource hono/jsx */
import { renderToString } from 'hono/jsx/dom/server'
import { DatabaseSection } from '../sections/DatabaseSection.js'
import { DevelopmentSection } from '../sections/DevelopmentSection.js'
import { IntroSection } from '../sections/IntroSection.js'
import { ScreensSection } from '../sections/ScreensSection.js'
import { WorkflowSection } from '../sections/WorkflowSection.js'

export function page() {
  return '<!doctype html>' + renderToString(<App />)
}

function App() {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>理想のアプリをあなたの想いから</title>
        <link rel="stylesheet" href="/public/styles.css" />
      </head>
      <body>
        <main class="app-shell">
          <IntroSection />
          <WorkflowSection />
          <DatabaseSection />
          <ScreensSection />
          <DevelopmentSection />
        </main>
        <script src="/public/app.js"></script>
      </body>
    </html>
  )
}
