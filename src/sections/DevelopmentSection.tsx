/** @jsxImportSource hono/jsx */

export function DevelopmentSection() {
  return (
    <section id="developmentSection" class="content-section hidden" aria-labelledby="development-title">
      <div class="mb-6 grid gap-3">
        <div class="grid gap-2">
          <p class="text-[0.82rem] font-extrabold uppercase text-teal-700">5. 開発</p>
          <h2 id="development-title" class="text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight text-stone-950">
            コード生成
          </h2>
        </div>
      </div>
      <div id="developmentStatus" class="development-status">開発開始を待っています</div>
      <div id="developmentResult" class="development-result hidden">
        <div>
          <p class="development-label">生成先</p>
          <code id="developmentPath" class="development-code"></code>
        </div>
        <div>
          <p class="development-label">生成ファイル</p>
          <ul id="developmentFiles" class="development-files"></ul>
        </div>
      </div>
      <div id="developmentScreensBlock" class="development-screens-block hidden">
        <p class="development-label">画面の生成</p>
        <div id="developmentScreenStatus" class="development-inline-status hidden">画面生成を待っています</div>
        <div id="developmentScreens" class="development-screen-list hidden"></div>
      </div>
      <details class="codex-debug-panel">
        <summary>ログ</summary>
        <div class="codex-debug-toolbar">
          <button id="codexDebugRefreshButton" type="button" class="secondary-action">更新</button>
          <button id="codexDebugToggleButton" type="button" class="secondary-action">停止</button>
          <button id="codexDebugClearButton" type="button" class="secondary-action">クリア</button>
        </div>
        <ol id="codexDebugLog" class="codex-debug-log">
          <li>まだWebSocketイベントはありません</li>
        </ol>
      </details>
      <div id="developmentCommandsBlock" class="development-result hidden">
        <div>
          <p class="development-label">起動コマンド</p>
          <pre id="developmentCommands" class="development-commands"></pre>
        </div>
      </div>
    </section>
  )
}
