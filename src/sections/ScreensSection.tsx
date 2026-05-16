/** @jsxImportSource hono/jsx */

export function ScreensSection() {
  return (
    <section id="screensSection" class="content-section hidden" aria-labelledby="screens-title">
      <div class="mb-6 grid gap-3">
        <div class="grid gap-2">
        <p class="text-[0.82rem] font-extrabold uppercase text-teal-700">4. 画面一覧</p>
        <h2 id="screens-title" class="text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight text-stone-950">
          アプリの画面
        </h2>
        </div>
      </div>
      <div id="screensError" class="mb-4 hidden rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"></div>
      <div id="screensList" class="mb-6 grid gap-3.5"></div>
      <div class="action-row">
        <button id="screensOkButton" class="primary-action" type="button">開発開始</button>
      </div>
    </section>
  )
}
