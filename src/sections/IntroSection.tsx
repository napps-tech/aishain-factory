/** @jsxImportSource hono/jsx */

export function IntroSection() {
  return (
    <section
      class="grid min-h-[calc(100vh-2rem)] items-start gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:pt-8"
      aria-labelledby="intro-title"
    >
      <div class="grid gap-5">
        <img
          src="/public/assets/aishain-factory-logo.png"
          alt="AI社員ファクトリー"
          class="h-auto w-full max-w-[220px] max-md:max-w-[190px]"
        />
        <h1 id="intro-title" class="text-[clamp(2.4rem,6vw,4.6rem)] font-extrabold leading-tight text-stone-950">
          理想の<span class="text-[#3263bf]">シャイン</span>を<br />
          あなたの想いから
        </h1>
        <p class="max-w-[680px] text-[1.08rem] leading-8 text-slate-600">
          作りたい業務システムを入力すると、業務の流れ、データベース設計、画面一覧を順番に整理します。
        </p>
        <form id="introForm" class="grid gap-2.5">
          <label for="projectInput" class="font-extrabold text-slate-800">
            つくりたいシステム
          </label>
          <div class="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_132px]">
            <textarea
              id="projectInput"
              name="project"
              rows={4}
              class="min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white/90 p-4 leading-7 text-slate-950 outline-none focus:border-violet-700 focus:ring-4 focus:ring-violet-700/15"
              placeholder="例: 顧客からの問い合わせを受け付け、担当者が対応状況を管理するシステム"
            ></textarea>
            <button
              type="submit"
              class="rounded-lg bg-violet-800 px-5 font-extrabold text-white shadow-lg shadow-violet-800/25 transition hover:-translate-y-0.5 hover:bg-violet-900 hover:shadow-xl hover:shadow-violet-800/30 max-md:min-h-13"
            >
              はじめる
            </button>
          </div>
          <p id="introError" class="hidden text-sm font-bold text-rose-700"></p>
        </form>
      </div>
      <div class="grid justify-items-center self-start pt-2 max-lg:order-first" aria-label="ナッピー">
        <div class="grid justify-items-center gap-4">
          <div class="max-w-[230px] rounded-lg border border-violet-800/20 bg-white/95 px-3.5 py-3 text-center text-sm font-extrabold text-violet-950 shadow-2xl max-lg:max-w-[190px] max-lg:text-[0.82rem]">
            いっしょに要件を形にするっぴ
          </div>
          <img
            src="/public/assets/nappy.png"
            alt="魔法使いのナッピー"
            class="h-auto w-full max-w-[260px] drop-shadow-2xl max-lg:max-w-[210px]"
          />
          <section id="recentSystems" class="hidden w-full max-w-[330px] rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/5" aria-labelledby="recent-systems-title">
            <p id="recent-systems-title" class="m-0 mb-2 text-sm font-extrabold text-slate-500">
              最近作ったシステム
            </p>
            <div id="recentSystemsList" class="grid gap-2"></div>
          </section>
        </div>
      </div>
    </section>
  )
}
