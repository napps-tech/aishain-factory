/** @jsxImportSource hono/jsx */

export function WorkflowSection() {
  return (
    <section id="workflowSection" class="content-section hidden" aria-labelledby="workflow-title">
      <div class="mb-6 grid gap-2">
        <p class="text-[0.82rem] font-extrabold uppercase text-teal-700">2. 業務の流れ</p>
        <h2 id="workflow-title" class="text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight text-stone-950">
          〇〇が△△する形式でまとめる
        </h2>
      </div>
      <ol id="workflowList" class="mb-6 grid gap-3"></ol>
      <div class="action-row action-row-between">
        <button id="addWorkflowRowButton" class="secondary-action" type="button">
          行追加
        </button>
        <button id="createWorkflowButton" class="primary-action" type="button">
          作成
        </button>
      </div>
    </section>
  )
}
