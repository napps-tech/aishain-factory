"use strict";
const requiredElement = (selector, constructor) => {
    const element = document.querySelector(selector);
    if (!(element instanceof constructor)) {
        throw new Error(`Required element was not found: ${selector}`);
    }
    return element;
};
const introForm = requiredElement('#introForm', HTMLFormElement);
const introError = requiredElement('#introError', HTMLElement);
const projectInput = requiredElement('#projectInput', HTMLTextAreaElement);
const recentSystems = requiredElement('#recentSystems', HTMLElement);
const recentSystemsList = requiredElement('#recentSystemsList', HTMLElement);
const startButton = requiredElement('#introForm button[type="submit"]', HTMLButtonElement);
const workflowSection = requiredElement('#workflowSection', HTMLElement);
const workflowList = requiredElement('#workflowList', HTMLElement);
const addWorkflowRowButton = requiredElement('#addWorkflowRowButton', HTMLButtonElement);
const createWorkflowButton = requiredElement('#createWorkflowButton', HTMLButtonElement);
const databaseSection = requiredElement('#databaseSection', HTMLElement);
const databaseError = requiredElement('#databaseError', HTMLElement);
const databaseOkButton = requiredElement('#databaseOkButton', HTMLButtonElement);
const erImage = requiredElement('#erImage', HTMLImageElement);
const erPanel = requiredElement('#erPanel', HTMLElement);
const erTabButton = requiredElement('#erTabButton', HTMLButtonElement);
const tablesList = requiredElement('#tablesList', HTMLElement);
const tablesPanel = requiredElement('#tablesPanel', HTMLElement);
const tablesTabButton = requiredElement('#tablesTabButton', HTMLButtonElement);
const screensError = requiredElement('#screensError', HTMLElement);
const screensList = requiredElement('#screensList', HTMLElement);
const screensSection = requiredElement('#screensSection', HTMLElement);
const screensOkButton = requiredElement('#screensOkButton', HTMLButtonElement);
const developmentSection = requiredElement('#developmentSection', HTMLElement);
const developmentStatus = requiredElement('#developmentStatus', HTMLElement);
const developmentScreens = requiredElement('#developmentScreens', HTMLElement);
const developmentResult = requiredElement('#developmentResult', HTMLElement);
const developmentPath = requiredElement('#developmentPath', HTMLElement);
const developmentFiles = requiredElement('#developmentFiles', HTMLElement);
const developmentScreensBlock = requiredElement('#developmentScreensBlock', HTMLElement);
const developmentScreenStatus = requiredElement('#developmentScreenStatus', HTMLElement);
const developmentCommandsBlock = requiredElement('#developmentCommandsBlock', HTMLElement);
const developmentCommands = requiredElement('#developmentCommands', HTMLElement);
const codexDebugRefreshButton = requiredElement('#codexDebugRefreshButton', HTMLButtonElement);
const codexDebugToggleButton = requiredElement('#codexDebugToggleButton', HTMLButtonElement);
const codexDebugClearButton = requiredElement('#codexDebugClearButton', HTMLButtonElement);
const codexDebugLog = requiredElement('#codexDebugLog', HTMLOListElement);
let currentDatabaseDesign;
let currentScreens = [];
let currentDraftFilename;
let codexDebugTimer;
let screenFilePollingTimer;
let activeDevelopmentProjectId;
let currentDevelopmentDraft;
const screenImageConcurrency = 2;
const projectFromQuery = new URLSearchParams(window.location.search).get('project');
const draftFromQuery = new URLSearchParams(window.location.search).get('draft');
currentDraftFilename = draftFromQuery || undefined;
if (projectFromQuery && !draftFromQuery && !projectInput.value.trim()) {
    projectInput.value = projectFromQuery;
}
const reveal = (element) => {
    element.classList.remove('hidden');
    element.classList.add('revealed');
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
const showSection = (element) => {
    element.classList.remove('hidden');
    element.classList.add('revealed');
};
const scrollToPageBottom = () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'auto',
            });
        });
    });
};
const setIntroError = (message) => {
    introError.textContent = message;
    introError.classList.toggle('hidden', !message);
};
const renderRecentDrafts = (drafts) => {
    recentSystemsList.textContent = '';
    recentSystems.classList.toggle('hidden', drafts.length === 0);
    drafts.forEach((draft) => {
        const link = document.createElement('a');
        link.href = `/?draft=${encodeURIComponent(draft.filename)}`;
        link.className =
            'block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950 no-underline transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white hover:shadow-md';
        link.textContent = draft.projectText;
        recentSystemsList.append(link);
    });
};
const loadRecentDrafts = async () => {
    const response = await fetch('/api/drafts');
    const data = (await response.json().catch(() => ({})));
    renderRecentDrafts(Array.isArray(data.drafts) ? data.drafts : []);
};
const setLoading = (loading) => {
    startButton.disabled = loading;
    startButton.textContent = loading ? '作成中' : 'はじめる';
};
const createWorkflow = async (projectText) => {
    const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ projectText }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '業務の流れを作成できませんでした');
    }
    const steps = data.workflow?.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('業務の流れが空でした');
    }
    return steps;
};
const normalizeScreen = (value) => value
    .trim()
    .replace(/画面で$/, '')
    .replace(/画面$/, '')
    .replace(/で$/, '');
const defaultScreenOptions = [
    '問い合わせ登録',
    '問い合わせ一覧',
    '問い合わせ詳細',
    '対応管理',
    '進捗確認',
    '設定',
];
const getWorkflowScreenOptions = (steps = []) => Array.from(new Set([...defaultScreenOptions, ...steps.map((step) => step.screen)]
    .filter(Boolean)
    .map(normalizeScreen)));
const createWorkflowRow = (step = { actor: '', screen: '', action: '' }, screenChoices = defaultScreenOptions) => {
    const item = document.createElement('li');
    item.className = 'flow-list-item';
    const actorSelect = document.createElement('select');
    actorSelect.className = 'workflow-select';
    actorSelect.setAttribute('aria-label', '業務の主体');
    const actorOptions = [
        '利用者',
        '受付担当者',
        '担当者',
        '管理者',
        'システム',
        step.actor,
    ].filter(Boolean);
    Array.from(new Set(actorOptions)).forEach((actor) => {
        const option = document.createElement('option');
        option.value = actor;
        option.textContent = actor + 'が';
        actorSelect.append(option);
    });
    actorSelect.value = step.actor || '利用者';
    const screenSelect = document.createElement('select');
    screenSelect.className = 'workflow-select workflow-screen-select';
    screenSelect.setAttribute('aria-label', '業務の画面');
    const screenOptions = Array.from(new Set([...screenChoices, step.screen].filter(Boolean).map(normalizeScreen)));
    screenOptions.forEach((screen) => {
        const option = document.createElement('option');
        option.value = screen;
        option.textContent = screen + 'で';
        screenSelect.append(option);
    });
    screenSelect.value = normalizeScreen(step.screen ?? '') || '問い合わせ登録';
    const actionInput = document.createElement('input');
    actionInput.className = 'workflow-input';
    actionInput.type = 'text';
    actionInput.value = step.action;
    actionInput.placeholder = '問い合わせを登録する';
    actionInput.setAttribute('aria-label', '業務の動作');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'workflow-delete-button';
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.setAttribute('aria-label', '業務フロー行を削除');
    deleteButton.addEventListener('click', () => {
        if (workflowList.children.length <= 1)
            return;
        item.remove();
    });
    item.append(actorSelect, screenSelect, actionInput, deleteButton);
    return item;
};
const renderWorkflow = (steps) => {
    workflowList.textContent = '';
    const screenChoices = getWorkflowScreenOptions(steps);
    steps.forEach((step) => {
        workflowList.append(createWorkflowRow(step, screenChoices));
    });
};
const collectWorkflowSteps = () => {
    return Array.from(workflowList.querySelectorAll('li'))
        .map((row) => ({
        actor: row.querySelector('select[aria-label="業務の主体"]')?.value.trim() ??
            '',
        screen: normalizeScreen(row.querySelector('select[aria-label="業務の画面"]')?.value ?? ''),
        action: row.querySelector('input[aria-label="業務の動作"]')?.value.trim() ??
            '',
    }))
        .filter((step) => step.actor && step.action);
};
const setDatabaseError = (message) => {
    databaseError.textContent = message;
    databaseError.classList.toggle('hidden', !message);
};
const setDatabaseLoading = (loading) => {
    createWorkflowButton.disabled = loading;
    createWorkflowButton.textContent = loading ? '設計中' : '作成';
};
const createDatabaseDesign = async (workflowSteps) => {
    const response = await fetch('/api/database-designs', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ workflowSteps }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || 'データベース設計を作成できませんでした');
    }
    if (!data.databaseDesign?.imageSrc || !Array.isArray(data.databaseDesign.tables)) {
        throw new Error('データベース設計の結果が空でした');
    }
    return data.databaseDesign;
};
const setDatabaseTab = (tab) => {
    const isEr = tab === 'er';
    erPanel.classList.toggle('hidden', !isEr);
    tablesPanel.classList.toggle('hidden', isEr);
    erTabButton.classList.toggle('tab-button-active', isEr);
    tablesTabButton.classList.toggle('tab-button-active', !isEr);
    erTabButton.setAttribute('aria-selected', String(isEr));
    tablesTabButton.setAttribute('aria-selected', String(!isEr));
};
const renderDatabaseDesign = (databaseDesign) => {
    currentDatabaseDesign = databaseDesign;
    erImage.src = databaseDesign.imageSrc;
    tablesList.textContent = '';
    databaseDesign.tables.forEach((table) => {
        const article = document.createElement('article');
        article.className = 'table-card';
        const title = document.createElement('div');
        title.className = 'table-card-title';
        const name = document.createElement('h3');
        name.textContent = table.displayName ? `${table.displayName} (${table.name})` : table.name;
        const description = document.createElement('p');
        description.textContent = table.description;
        title.append(name, description);
        const columnList = document.createElement('div');
        columnList.className = 'column-list';
        table.columns.forEach((column) => {
            const row = document.createElement('div');
            row.className = 'column-row';
            const columnName = document.createElement('strong');
            columnName.textContent = column.name;
            const meta = document.createElement('span');
            meta.textContent = [
                column.isPrimaryKey ? 'PK' : '',
                column.references ? `FK -> ${column.references}` : '',
                column.type,
            ]
                .filter(Boolean)
                .join(' / ');
            const detail = document.createElement('p');
            detail.textContent = column.description;
            row.append(columnName, meta, detail);
            columnList.append(row);
        });
        article.append(title, columnList);
        tablesList.append(article);
    });
    setDatabaseTab('er');
};
const setScreensError = (message) => {
    screensError.textContent = message;
    screensError.classList.toggle('hidden', !message);
};
const setScreensLoading = (loading) => {
    databaseOkButton.disabled = loading;
    databaseOkButton.textContent = loading ? '洗い出し中' : '画面をつくる';
};
const createScreenPlan = async (workflowSteps, tables) => {
    const response = await fetch('/api/screens', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ workflowSteps, tables }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '画面一覧を作成できませんでした');
    }
    const screens = data.screenPlan?.screens;
    if (!Array.isArray(screens) || screens.length === 0) {
        throw new Error('画面一覧の結果が空でした');
    }
    return screens;
};
const createScreenImage = async (screen) => {
    const response = await fetch('/api/screen-images', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ screen }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '画面画像を生成できませんでした');
    }
    if (!data.image) {
        throw new Error('画面画像の結果が空でした');
    }
    return data.image;
};
const createBaseProject = async () => {
    const response = await fetch('/api/base-projects', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            projectText: projectInput.value.trim(),
            tables: currentDatabaseDesign?.tables ?? [],
            screens: collectScreensForDraft(),
        }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || 'ベースプロジェクトを生成できませんでした');
    }
    if (!data.project?.relativePath || !Array.isArray(data.project.files)) {
        throw new Error('ベースプロジェクトの結果が空でした');
    }
    return data.project;
};
const implementBaseProjectScreen = async (projectId, screen) => {
    const response = await fetch(`/api/base-projects/${encodeURIComponent(projectId)}/screens/${encodeURIComponent(screen.id)}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ screen }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '画面を実装できませんでした');
    }
    if (!data.screen?.id) {
        throw new Error('画面実装の結果が空でした');
    }
    return data.screen;
};
const implementBaseProjectScreens = async (projectId, screens) => {
    const response = await fetch(`/api/base-projects/${encodeURIComponent(projectId)}/screens`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            screens,
        }),
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '画面を実装できませんでした');
    }
    if (!Array.isArray(data.screens)) {
        throw new Error('画面実装の結果が空でした');
    }
    return data.screens;
};
const fetchScreenFileStatus = async (projectId, screenId) => {
    const response = await fetch(`/api/base-projects/${encodeURIComponent(projectId)}/screens/${encodeURIComponent(screenId)}/file-status`);
    const data = (await response.json().catch(() => ({})));
    return response.ok ? data.status : undefined;
};
const fetchBaseProjectStatus = async (projectId) => {
    const response = await fetch(`/api/base-projects/${encodeURIComponent(projectId)}/status`);
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.error || '生成プロジェクトの状態を確認できませんでした');
    }
    return data.status;
};
const setDevelopmentLoading = (loading) => {
    screensOkButton.disabled = loading;
    screensOkButton.textContent = loading ? '開発中' : '開発開始';
};
const setDevelopmentScreenStatus = (message) => {
    developmentScreenStatus.textContent = message;
    developmentScreenStatus.classList.toggle('hidden', !message);
};
const renderCodexDebugLog = (events) => {
    codexDebugLog.textContent = '';
    if (events.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'まだWebSocketイベントはありません';
        codexDebugLog.append(empty);
        return;
    }
    events.forEach((event) => {
        const item = document.createElement('li');
        item.className = `codex-debug-event codex-debug-event-${event.direction}`;
        const meta = document.createElement('div');
        meta.className = 'codex-debug-meta';
        const time = document.createElement('time');
        time.dateTime = event.at;
        time.textContent = new Date(event.at).toLocaleTimeString();
        const direction = document.createElement('span');
        direction.textContent = event.direction;
        const label = document.createElement('strong');
        label.textContent = event.label;
        meta.append(time, direction, label);
        const detail = document.createElement('pre');
        detail.textContent = event.detail;
        item.append(meta, detail);
        codexDebugLog.append(item);
    });
};
const refreshCodexDebugLog = async () => {
    const response = await fetch('/api/codex-debug');
    const data = (await response.json().catch(() => ({})));
    renderCodexDebugLog(Array.isArray(data.events) ? data.events : []);
};
const clearCodexDebugLog = async () => {
    await fetch('/api/codex-debug', { method: 'DELETE' });
    renderCodexDebugLog([]);
};
const checkCodexServerStatus = async () => {
    const response = await fetch('/api/codex-server-status');
    const data = (await response.json().catch(() => ({})));
    return {
        ok: response.ok && data.ok === true,
        url: String(data.url ?? 'ws://127.0.0.1:8080'),
        error: typeof data.error === 'string' ? data.error : undefined,
    };
};
const startCodexDebugPolling = () => {
    if (codexDebugTimer !== undefined)
        return;
    void refreshCodexDebugLog();
    codexDebugToggleButton.textContent = '停止';
    codexDebugTimer = window.setInterval(() => {
        void refreshCodexDebugLog();
    }, 1000);
};
const stopCodexDebugPolling = () => {
    if (codexDebugTimer === undefined)
        return;
    window.clearInterval(codexDebugTimer);
    codexDebugTimer = undefined;
    codexDebugToggleButton.textContent = '再開';
    void refreshCodexDebugLog();
};
const startScreenFilePolling = (projectId, screens) => {
    stopScreenFilePolling();
    const poll = async () => {
        await Promise.all(screens.map(async (screen) => {
            const status = await fetchScreenFileStatus(projectId, screen.id);
            if (status?.exists) {
                setDevelopmentScreenFileCreated(screen, status);
            }
        }));
    };
    void poll();
    screenFilePollingTimer = window.setInterval(() => {
        void poll();
    }, 1000);
};
const stopScreenFilePolling = () => {
    if (screenFilePollingTimer === undefined)
        return;
    window.clearInterval(screenFilePollingTimer);
    screenFilePollingTimer = undefined;
};
const screenRouteId = (screen) => {
    const source = screen.id || screen.name || 'screen';
    const routeId = source
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    return routeId || 'screen';
};
const screenRouteTarget = (screen) => {
    const routeId = screenRouteId(screen);
    return {
        filePath: `src/routes/${routeId}.ts`,
        routePath: `/screens/${routeId}`,
    };
};
const screenRouteTargetText = (screen) => {
    const target = screenRouteTarget(screen);
    return `生成先: ${target.routePath} / ${target.filePath}`;
};
const createDevelopmentScreenDrafts = (screens) => screens.map((screen) => {
    const target = screenRouteTarget(screen);
    return {
        id: screen.id,
        name: screen.name,
        routePath: target.routePath,
        relativePath: target.filePath,
        status: 'pending',
    };
});
const updateDevelopmentDraft = (updates, persist = true) => {
    currentDevelopmentDraft = {
        ...currentDevelopmentDraft,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    if (persist) {
        void saveDraft();
    }
};
const updateDevelopmentScreenDraft = (screen, updates, persist = true) => {
    if (!currentDevelopmentDraft?.screens || !screen.id)
        return;
    let changed = false;
    currentDevelopmentDraft = {
        ...currentDevelopmentDraft,
        screens: currentDevelopmentDraft.screens.map((item) => {
            if (item.id !== screen.id)
                return item;
            const next = { ...item, ...updates };
            changed = JSON.stringify(next) !== JSON.stringify(item);
            return next;
        }),
        updatedAt: new Date().toISOString(),
    };
    if (changed && persist) {
        void saveDraft();
    }
};
const updateDevelopmentCompletionFromScreens = () => {
    const screens = currentDevelopmentDraft?.screens ?? [];
    if (screens.length === 0)
        return;
    const generatedCount = screens.filter((screen) => screen.status === 'generated').length;
    const failedCount = screens.filter((screen) => screen.status === 'failed').length;
    const isFinished = generatedCount + failedCount === screens.length;
    if (!isFinished)
        return;
    const statusText = failedCount > 0
        ? `一部完了: ${generatedCount}画面を生成済み、${failedCount}画面は再生成できます`
        : '完了: 画面生成が完了しました';
    updateDevelopmentDraft({
        status: failedCount > 0 ? 'partial' : 'completed',
        statusText,
        completedAt: new Date().toISOString(),
    });
    developmentStatus.textContent = statusText;
    setDevelopmentScreenStatus(statusText);
};
const applyDevelopmentScreenDraft = (screen) => {
    const sourceScreen = currentScreens.find((item) => item.id === screen.id) ?? screen;
    if (screen.status === 'generated') {
        setDevelopmentScreenDone({
            id: screen.id,
            name: screen.name,
            summary: '',
            elements: [],
        }, {
            id: screen.id,
            name: screen.name,
            routePath: screen.routePath,
            status: '生成済み',
        });
        return;
    }
    if (screen.status === 'working') {
        setDevelopmentScreenWorking(sourceScreen);
        return;
    }
    if (screen.status === 'failed') {
        setDevelopmentScreenFailed(sourceScreen, screen.message ?? '生成を完了できませんでした');
    }
};
const renderBaseProject = (project) => {
    developmentPath.textContent = project.relativePath;
    developmentFiles.textContent = '';
    project.files.forEach((file) => {
        const item = document.createElement('li');
        item.textContent = file;
        developmentFiles.append(item);
    });
    developmentCommands.textContent = project.commands.join('\n');
    developmentResult.classList.remove('hidden');
    developmentCommandsBlock.classList.remove('hidden');
};
const findDevelopmentScreenItem = (screen) => {
    const escapedId = screen.id ? CSS.escape(screen.id) : '';
    const escapedName = screen.name ? CSS.escape(screen.name) : '';
    return developmentScreens.querySelector([
        escapedId ? `[data-screen-id="${escapedId}"]` : '',
        escapedName ? `[data-screen-name="${escapedName}"]` : '',
    ]
        .filter(Boolean)
        .join(','));
};
const setDevelopmentScreenWorking = (screen) => {
    const item = findDevelopmentScreenItem(screen);
    const status = item?.querySelector('.development-screen-status');
    const summary = item?.querySelector('p');
    if (!item || !status || !summary)
        return;
    item.classList.remove('development-screen-item-failed', 'development-screen-item-done');
    item.classList.add('development-screen-item-working');
    status.disabled = true;
    status.onclick = null;
    status.textContent = '作成中';
    summary.textContent = screenRouteTargetText(screen);
    updateDevelopmentScreenDraft(screen, {
        status: 'working',
        message: summary.textContent,
    });
};
const setDevelopmentScreenDone = (sourceScreen, implementedScreen) => {
    const item = findDevelopmentScreenItem(sourceScreen);
    const status = item?.querySelector('.development-screen-status');
    const summary = item?.querySelector('p');
    if (!item || !status || !summary)
        return;
    status.textContent = '生成済み';
    status.disabled = true;
    status.onclick = null;
    item.classList.remove('development-screen-item-working', 'development-screen-item-failed');
    item.classList.add('development-screen-item-done');
    summary.textContent = `${implementedScreen.routePath} に実装しました`;
    updateDevelopmentScreenDraft(sourceScreen, {
        status: 'generated',
        routePath: implementedScreen.routePath,
        relativePath: screenRouteTarget(sourceScreen).filePath,
        message: summary.textContent,
    });
};
const setDevelopmentScreenGeneratedFromFile = (screen, fileStatus) => {
    setDevelopmentScreenDone(screen, {
        id: screen.id,
        name: screen.name,
        routePath: fileStatus.routePath,
        status: '生成済み',
    });
};
const setDevelopmentScreenFileCreated = (screen, fileStatus) => {
    setDevelopmentScreenGeneratedFromFile(screen, fileStatus);
};
const setDevelopmentScreenFailed = (screen, message) => {
    const item = findDevelopmentScreenItem(screen);
    const status = item?.querySelector('.development-screen-status');
    const summary = item?.querySelector('p');
    if (!item || !status || !summary)
        return;
    item.classList.remove('development-screen-item-working');
    item.classList.add('development-screen-item-failed');
    status.disabled = false;
    status.textContent = '再生成';
    status.onclick = () => {
        void retryDevelopmentScreen(screen);
    };
    summary.textContent = message;
    updateDevelopmentScreenDraft(screen, {
        status: 'failed',
        message,
    });
};
const renderDevelopmentScreenStatuses = (screens) => {
    developmentScreens.textContent = '';
    developmentScreensBlock.classList.toggle('hidden', screens.length === 0);
    setDevelopmentScreenStatus(screens.length > 0 ? '画面生成を待っています' : '');
    developmentScreens.classList.toggle('hidden', screens.length === 0);
    screens.forEach((screen) => {
        const item = document.createElement('article');
        item.className = 'development-screen-item';
        item.dataset.screenId = screen.id;
        item.dataset.screenName = screen.name;
        const text = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = screen.name;
        const summary = document.createElement('p');
        summary.textContent = screenRouteTargetText(screen);
        text.append(title, summary);
        const status = document.createElement('button');
        status.className = 'development-screen-status';
        status.type = 'button';
        status.disabled = true;
        status.textContent = '待機中';
        item.append(text, status);
        developmentScreens.append(item);
    });
};
const setDevelopmentScreensFailed = () => {
    developmentScreens
        .querySelectorAll('.development-screen-item')
        .forEach((item) => {
        const status = item.querySelector('.development-screen-status');
        const summary = item.querySelector('p');
        if (!status || !summary)
            return;
        item.classList.remove('development-screen-item-working');
        item.classList.add('development-screen-item-failed');
        status.textContent = '失敗';
        summary.textContent = '生成を完了できませんでした';
    });
};
const retryDevelopmentScreen = async (screen) => {
    if (!activeDevelopmentProjectId || !screen.id || !screen.name)
        return;
    const savedScreen = collectScreensForDraft().find((item) => item.id === screen.id);
    if (!savedScreen)
        return;
    setDevelopmentScreenWorking(savedScreen);
    startScreenFilePolling(activeDevelopmentProjectId, [savedScreen]);
    try {
        const implementedScreen = await implementBaseProjectScreen(activeDevelopmentProjectId, savedScreen);
        setDevelopmentScreenDone(savedScreen, implementedScreen);
    }
    catch (error) {
        const status = await fetchScreenFileStatus(activeDevelopmentProjectId, savedScreen.id);
        if (status?.exists) {
            setDevelopmentScreenGeneratedFromFile(savedScreen, status);
        }
        else {
            setDevelopmentScreenFailed(savedScreen, error instanceof Error ? error.message : '画面を実装できませんでした');
        }
    }
    finally {
        stopScreenFilePolling();
        updateDevelopmentCompletionFromScreens();
    }
};
const markScreensByGeneratedFiles = async (projectId, screens, fallbackMessage) => {
    let generatedCount = 0;
    let failedCount = 0;
    await Promise.all(screens.map(async (screen) => {
        const status = await fetchScreenFileStatus(projectId, screen.id);
        if (status?.exists) {
            generatedCount += 1;
            setDevelopmentScreenGeneratedFromFile(screen, status);
            return;
        }
        failedCount += 1;
        setDevelopmentScreenFailed(screen, fallbackMessage);
    }));
    return { generatedCount, failedCount };
};
const imagePreview = document.createElement('div');
imagePreview.className = 'screen-image-preview hidden';
imagePreview.setAttribute('role', 'dialog');
imagePreview.setAttribute('aria-modal', 'true');
const previewCloseButton = document.createElement('button');
previewCloseButton.className = 'screen-image-preview-close';
previewCloseButton.type = 'button';
previewCloseButton.textContent = '閉じる';
const previewImage = document.createElement('img');
previewImage.alt = '';
imagePreview.append(previewCloseButton, previewImage);
document.body.append(imagePreview);
const closeImagePreview = () => {
    imagePreview.classList.add('hidden');
    previewImage.src = '';
    previewImage.alt = '';
};
const openImagePreview = (image) => {
    if (!image.src)
        return;
    previewImage.src = image.src;
    previewImage.alt = image.alt;
    imagePreview.classList.remove('hidden');
    previewCloseButton.focus();
};
previewCloseButton.addEventListener('click', closeImagePreview);
imagePreview.addEventListener('click', (event) => {
    if (event.target === imagePreview)
        closeImagePreview();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !imagePreview.classList.contains('hidden')) {
        closeImagePreview();
    }
});
const renderScreenPlan = (screens) => {
    currentScreens = screens;
    screensList.textContent = '';
    screens.forEach((screen) => {
        const article = document.createElement('article');
        article.className = 'generated-screen-card';
        article.dataset.screenId = screen.id;
        const imageWrap = document.createElement('div');
        imageWrap.className = 'generated-screen-image-wrap';
        const loading = document.createElement('div');
        loading.className = 'screen-image-loading';
        loading.textContent = '画像生成待ち';
        const image = document.createElement('img');
        image.className = 'generated-screen-image hidden';
        image.alt = `${screen.name}の画面イメージ`;
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', `${screen.name}の画面イメージを拡大`);
        image.addEventListener('click', () => openImagePreview(image));
        image.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openImagePreview(image);
            }
        });
        imageWrap.append(loading, image);
        const body = document.createElement('div');
        body.className = 'generated-screen-body';
        const title = document.createElement('h3');
        title.textContent = screen.name;
        const summary = document.createElement('p');
        summary.textContent = screen.summary;
        const elements = document.createElement('ul');
        elements.className = 'screen-elements-list';
        screen.elements.forEach((element) => {
            const item = document.createElement('li');
            const name = document.createElement('strong');
            const type = document.createElement('span');
            const description = document.createElement('p');
            name.textContent = element.name;
            type.textContent = element.type;
            description.textContent = element.description;
            item.append(name, type, description);
            elements.append(item);
        });
        body.append(title, summary, elements);
        article.append(imageWrap, body);
        screensList.append(article);
    });
};
const renderSavedScreenImages = (screens) => {
    screens.forEach((screen) => {
        if (!screen.imageSrc)
            return;
        const card = screensList.querySelector(`[data-screen-id="${screen.id}"]`);
        const loading = card?.querySelector('.screen-image-loading');
        const image = card?.querySelector('img');
        if (!card || !loading || !image)
            return;
        image.src = screen.imageSrc;
        image.classList.remove('hidden');
        loading.classList.add('hidden');
    });
};
const collectScreensForDraft = () => currentScreens.map((screen) => {
    const image = screensList.querySelector(`[data-screen-id="${screen.id}"] img`);
    return {
        ...screen,
        imageSrc: image?.src || undefined,
    };
});
const restoreDevelopmentDraft = async (development) => {
    const project = development?.project;
    if (!project?.id) {
        currentDevelopmentDraft = undefined;
        activeDevelopmentProjectId = undefined;
        setDevelopmentLoading(false);
        return false;
    }
    const status = await fetchBaseProjectStatus(project.id);
    if (!status?.exists) {
        currentDevelopmentDraft = undefined;
        activeDevelopmentProjectId = undefined;
        setDevelopmentLoading(false);
        void saveDraft();
        return false;
    }
    currentDevelopmentDraft = development ?? undefined;
    activeDevelopmentProjectId = project.id;
    renderBaseProject(project);
    const screens = collectScreensForDraft();
    renderDevelopmentScreenStatuses(screens);
    for (const screen of development?.screens ?? []) {
        applyDevelopmentScreenDraft(screen);
    }
    await Promise.all(screens.map(async (screen) => {
        const fileStatus = await fetchScreenFileStatus(project.id, screen.id);
        if (fileStatus?.exists) {
            setDevelopmentScreenGeneratedFromFile(screen, fileStatus);
        }
    }));
    const statusText = currentDevelopmentDraft?.statusText ??
        (currentDevelopmentDraft?.status === 'completed'
            ? '完了: 画面生成が完了しました'
            : '開発プロジェクトを復元しました');
    developmentStatus.textContent = statusText;
    setDevelopmentScreenStatus(statusText);
    showSection(developmentSection);
    const completed = currentDevelopmentDraft?.status === 'completed';
    screensOkButton.disabled = completed;
    screensOkButton.textContent = completed ? '開発済み' : '開発再開';
    void saveDraft();
    return true;
};
const loadDraft = async (filename) => {
    try {
        const response = await fetch(`/api/drafts/${encodeURIComponent(filename)}`);
        const data = (await response.json().catch(() => ({})));
        if (!response.ok || !data.draft) {
            throw new Error(data.error || '途中保存ファイルを読み込めませんでした');
        }
        currentDraftFilename = filename;
        const draft = data.draft;
        projectInput.value = String(draft.projectText ?? '');
        let restoredSections = 0;
        if (Array.isArray(draft.workflowSteps) && draft.workflowSteps.length > 0) {
            renderWorkflow(draft.workflowSteps);
            showSection(workflowSection);
            restoredSections += 1;
        }
        if (draft.databaseDesign?.imageSrc && Array.isArray(draft.databaseDesign.tables)) {
            renderDatabaseDesign(draft.databaseDesign);
            showSection(databaseSection);
            restoredSections += 1;
        }
        if (Array.isArray(draft.screens) && draft.screens.length > 0) {
            renderScreenPlan(draft.screens);
            renderSavedScreenImages(draft.screens);
            showSection(screensSection);
            restoredSections += 1;
        }
        if (await restoreDevelopmentDraft(draft.development)) {
            restoredSections += 1;
        }
        if (restoredSections === 0) {
            setIntroError(`${filename} は復元できる途中データがありません`);
        }
        else {
            scrollToPageBottom();
        }
    }
    catch (error) {
        setIntroError(error instanceof Error
            ? error.message
            : '途中保存ファイルを読み込めませんでした');
    }
};
const saveDraft = async () => {
    try {
        const response = await fetch('/api/drafts', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentDraftFilename,
                projectText: projectInput.value.trim(),
                workflowSteps: collectWorkflowSteps(),
                databaseDesign: currentDatabaseDesign ?? null,
                screens: collectScreensForDraft(),
                development: currentDevelopmentDraft ?? null,
            }),
        });
        const data = (await response.json().catch(() => ({})));
        if (!response.ok) {
            throw new Error(data.error || '途中保存に失敗しました');
        }
        currentDraftFilename = data.filename ?? data.path?.split('/').pop() ?? currentDraftFilename;
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : '途中保存に失敗しました');
    }
};
const fillSingleScreenImage = async (screen) => {
    const card = screensList.querySelector(`[data-screen-id="${screen.id}"]`);
    const loading = card?.querySelector('.screen-image-loading');
    const image = card?.querySelector('img');
    if (!card || !loading || !image)
        return;
    loading.textContent = '画像生成中';
    try {
        const imageResult = await createScreenImage(screen);
        image.src = imageResult.imageSrc;
        image.classList.remove('hidden');
        loading.classList.add('hidden');
        if (imageResult.source === 'svg-fallback') {
            card.classList.add('screen-image-fallback');
            image.title = imageResult.fallbackReason || 'SVGフォールバック';
        }
        void saveDraft();
    }
    catch (error) {
        loading.textContent =
            error instanceof Error ? error.message : '画像生成に失敗しました';
        loading.classList.add('screen-image-error');
    }
};
const fillScreenImages = async (screens) => {
    let nextIndex = 0;
    const workerCount = Math.min(screenImageConcurrency, screens.length);
    const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < screens.length) {
            const screen = screens[nextIndex];
            nextIndex += 1;
            await fillSingleScreenImage(screen);
        }
    });
    await Promise.all(workers);
};
introForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const projectText = projectInput.value.trim();
    if (!projectText) {
        setIntroError('作りたいシステムを入力してください');
        return;
    }
    setIntroError('');
    setLoading(true);
    try {
        const steps = await createWorkflow(projectText);
        renderWorkflow(steps);
        reveal(workflowSection);
        void saveDraft();
    }
    catch (error) {
        setIntroError(error instanceof Error ? error.message : String(error));
    }
    finally {
        setLoading(false);
    }
});
createWorkflowButton.addEventListener('click', async () => {
    const workflowSteps = collectWorkflowSteps();
    if (workflowSteps.length === 0) {
        setDatabaseError('業務の流れを入力してください');
        reveal(databaseSection);
        return;
    }
    setDatabaseError('');
    setDatabaseLoading(true);
    try {
        const databaseDesign = await createDatabaseDesign(workflowSteps);
        renderDatabaseDesign(databaseDesign);
        reveal(databaseSection);
        void saveDraft();
    }
    catch (error) {
        setDatabaseError(error instanceof Error ? error.message : String(error));
        reveal(databaseSection);
    }
    finally {
        setDatabaseLoading(false);
    }
});
addWorkflowRowButton.addEventListener('click', () => {
    workflowList.append(createWorkflowRow(undefined, getWorkflowScreenOptions(collectWorkflowSteps())));
    const rows = workflowList.querySelectorAll('li');
    const lastRow = rows[rows.length - 1];
    lastRow?.querySelector('input')?.focus();
});
databaseOkButton.addEventListener('click', async () => {
    const workflowSteps = collectWorkflowSteps();
    if (workflowSteps.length === 0) {
        setScreensError('業務の流れを入力してください');
        reveal(screensSection);
        return;
    }
    setScreensError('');
    setScreensLoading(true);
    screensList.textContent = '';
    try {
        const screens = await createScreenPlan(workflowSteps, currentDatabaseDesign?.tables ?? []);
        renderScreenPlan(screens);
        reveal(screensSection);
        void saveDraft();
        void fillScreenImages(screens);
    }
    catch (error) {
        setScreensError(error instanceof Error ? error.message : String(error));
        reveal(screensSection);
    }
    finally {
        setScreensLoading(false);
    }
});
erTabButton.addEventListener('click', () => {
    setDatabaseTab('er');
});
tablesTabButton.addEventListener('click', () => {
    setDatabaseTab('tables');
});
screensOkButton.addEventListener('click', () => {
    setDevelopmentLoading(true);
    startCodexDebugPolling();
    developmentResult.classList.add('hidden');
    developmentScreensBlock.classList.add('hidden');
    setDevelopmentScreenStatus('');
    developmentCommandsBlock.classList.add('hidden');
    const screensForDevelopment = collectScreensForDraft();
    renderDevelopmentScreenStatuses(screensForDevelopment);
    developmentStatus.textContent =
        '作業中: Hono + Tailwind + Turso + Drizzle の土台を生成しています';
    reveal(developmentSection);
    void (async () => {
        const codexServerStatus = await checkCodexServerStatus();
        if (!codexServerStatus.ok) {
            const message = `${codexServerStatus.url} に接続できません: ${codexServerStatus.error ?? 'codex-serverが起動していません'}`;
            developmentStatus.textContent = `失敗: codex-serverに接続できません`;
            for (const screen of screensForDevelopment) {
                setDevelopmentScreenFailed(screen, message);
            }
            setDevelopmentLoading(false);
            stopCodexDebugPolling();
            return;
        }
        const project = await createBaseProject();
        activeDevelopmentProjectId = project.id;
        updateDevelopmentDraft({
            project,
            status: 'working',
            statusText: '作業中: 画面を生成しています',
            screens: createDevelopmentScreenDrafts(screensForDevelopment),
            completedAt: undefined,
        });
        renderBaseProject(project);
        developmentStatus.textContent = '作業中: 画面を生成しています';
        setDevelopmentScreenStatus('生成中: 画面ファイルの作成を待っています');
        for (const screen of screensForDevelopment) {
            setDevelopmentScreenWorking(screen);
        }
        startScreenFilePolling(project.id, screensForDevelopment);
        try {
            const implementedScreens = await implementBaseProjectScreens(project.id, screensForDevelopment);
            stopScreenFilePolling();
            const implementedById = new Map(implementedScreens.map((screen) => [screen.id, screen]));
            let failedCount = 0;
            for (const screen of screensForDevelopment) {
                const implementedScreen = implementedById.get(screen.id);
                if (!implementedScreen) {
                    const status = await fetchScreenFileStatus(project.id, screen.id);
                    if (status?.exists) {
                        setDevelopmentScreenGeneratedFromFile(screen, status);
                    }
                    else {
                        failedCount += 1;
                        setDevelopmentScreenFailed(screen, '画面実装の結果がありませんでした');
                    }
                    continue;
                }
                setDevelopmentScreenDone(screen, implementedScreen);
            }
            developmentStatus.textContent =
                failedCount > 0
                    ? `一部完了: ${screensForDevelopment.length - failedCount}画面を生成済み、${failedCount}画面は再生成できます`
                    : '完了: 画面生成が完了しました';
            updateDevelopmentDraft({
                status: failedCount > 0 ? 'partial' : 'completed',
                statusText: developmentStatus.textContent,
                completedAt: new Date().toISOString(),
            });
            setDevelopmentScreenStatus(failedCount > 0
                ? `一部完了: ${screensForDevelopment.length - failedCount}画面を生成済み、${failedCount}画面は再生成できます`
                : '完了: 画面生成が完了しました');
        }
        catch (error) {
            stopScreenFilePolling();
            const result = await markScreensByGeneratedFiles(project.id, screensForDevelopment, error instanceof Error ? error.message : '画面を実装できませんでした');
            developmentStatus.textContent =
                result.generatedCount > 0
                    ? `一部完了: ${result.generatedCount}画面を生成済み、${result.failedCount}画面は再生成できます`
                    : '失敗: 全画面の実装に失敗しました';
            updateDevelopmentDraft({
                status: result.generatedCount > 0 ? 'partial' : 'failed',
                statusText: developmentStatus.textContent,
                completedAt: new Date().toISOString(),
            });
            setDevelopmentScreenStatus(developmentStatus.textContent);
            setDevelopmentLoading(false);
            stopCodexDebugPolling();
            return;
        }
        if (!developmentStatus.textContent.startsWith('完了:') &&
            !developmentStatus.textContent.startsWith('一部完了:')) {
            developmentStatus.textContent = '完了: 画面生成が完了しました';
        }
        updateDevelopmentDraft({
            status: developmentStatus.textContent.startsWith('一部完了:')
                ? 'partial'
                : 'completed',
            statusText: developmentStatus.textContent,
            completedAt: new Date().toISOString(),
        });
        setDevelopmentScreenStatus(developmentStatus.textContent);
        screensOkButton.textContent = '開発中';
        screensOkButton.disabled = true;
        stopCodexDebugPolling();
    })()
        .catch((error) => {
        developmentStatus.textContent =
            error instanceof Error ? error.message : '開発準備に失敗しました';
        updateDevelopmentDraft({
            status: 'failed',
            statusText: developmentStatus.textContent,
            completedAt: new Date().toISOString(),
        });
        setDevelopmentScreensFailed();
        setDevelopmentLoading(false);
        stopScreenFilePolling();
        stopCodexDebugPolling();
    });
});
codexDebugRefreshButton.addEventListener('click', () => {
    void refreshCodexDebugLog();
});
codexDebugToggleButton.addEventListener('click', () => {
    if (codexDebugTimer === undefined) {
        startCodexDebugPolling();
        return;
    }
    stopCodexDebugPolling();
});
codexDebugClearButton.addEventListener('click', () => {
    void clearCodexDebugLog();
});
if (draftFromQuery) {
    void loadDraft(draftFromQuery);
}
void loadRecentDrafts();
