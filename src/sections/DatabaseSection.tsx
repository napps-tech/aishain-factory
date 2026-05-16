/** @jsxImportSource hono/jsx */

export function DatabaseSection() {
  return (
    <section id="databaseSection" class="content-section hidden" aria-labelledby="database-title">
      <div class="mb-6 grid gap-2">
        <p class="text-[0.82rem] font-extrabold uppercase text-teal-700">3. データベース設計</p>
        <h2 id="database-title" class="text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight text-stone-950">
          データベース設計
        </h2>
      </div>
      <div class="mb-4 flex gap-2" role="tablist" aria-label="データベース設計表示">
        <button id="erTabButton" class="tab-button tab-button-active" type="button" role="tab" aria-selected="true">
          ER図
        </button>
        <button id="tablesTabButton" class="tab-button" type="button" role="tab" aria-selected="false">
          テーブル一覧
        </button>
      </div>
      <div id="databaseError" class="mb-4 hidden rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"></div>
      <div id="erPanel" role="tabpanel">
        <div class="er-image-board" aria-label="ER図">
          <img id="erImage" class="er-image" alt="生成されたER図" />
        </div>
      </div>
      <div id="tablesPanel" class="hidden" role="tabpanel">
        <div id="tablesList" class="tables-list"></div>
      </div>
      <div class="action-row">
        <button id="databaseOkButton" class="primary-action" type="button">画面をつくる</button>
      </div>
    </section>
  )
}
