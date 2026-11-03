const YTD_OPTIONS = (() => {
  const LANGUAGE_STORAGE_KEY = "ytd_options_language";
  const PREVIEW_STORAGE_PREFIX = "youtubeDigestPreview:";
  const SUPPORTED_LANGUAGES = new Set(["en", "zh-CN"]);

  const COPY = {
    en: {
      biliReady: "Bilibili captions are ready to use",
      biliReadyHelp: "Reading, search, playback sync and excerpts need no API key.",
      aiSectionHelp: "Optional translation, overviews and explanations.",
      keyPlaceholder: "Enter your API key",
      advancedSettings: "Model and service URL",
      baseUrlLabel: "Service URL",
      baseUrlHelp: "Use a Chat Completions-compatible API base URL.",
      modelLabel: "Model name",
      providerHelp: "Use the matching key when changing providers. Saving may ask for access to that service.",
      cacheTitle: "Caption and AI cache",
      cacheHelp: "Fetch again when needed. Settings and excerpts are kept.",
      dataManagement: "Delete excerpts or reset",
      destructiveHelp: "These actions cannot be undone. Export any excerpts you want to keep first.",
      loadingSettings: "Loading settings…",
      unsavedHint: "Save your changes before testing. The test makes one small AI request.",
      needKeyHint: "To test, enter and save an API key. Reading original captions needs no key.",
      connectionHint: "Tests the saved configuration with one small AI request. Your provider may charge for it.",
      connectionTestingHint: "Testing the saved configuration. Please wait.",
      testConnection: "Test connection",
      testNeedsSave: "Test connection (save first)",
      testing: "Testing…",
      connectionSuccess: "Connected. The saved configuration is ready.",
      connectionFailed: ({ error }) => "Connection failed: {error}".replace("{error}", error),
      connectionTimeout: "The test timed out. Please try again.",
      connectionUnavailable: "Open this page from the installed extension to test.",
      permissionDenied: "Access to this model service was not granted.",
      externalSettingsChanged: "Settings changed in another page. Save this form again before testing.",
      notesConfirm: "Delete all excerpts? This cannot be undone. Export them first.",
      pageTitle: "BiliMemo Settings",
      languageGroupLabel: "Interface language",
      heading: "Settings",
      lede: "Start with original captions. Add an AI service when you need translation or an overview.",
      transcriptProvider: "Transcript provider",
      supadataApiKeyLabel: "Supadata API key",
      supadataHelp: "Only needed for YouTube subtitles. Bilibili reads its own subtitles without this key. ",
      supadataLink: "Create a Supadata account and key",
      supadataHelpSuffix:
        ". Supadata generates the key during onboarding.",
      aiProvider: "AI provider",
      providerSummaryLabel: "Supported AI provider",
      providerBadge: "Supported in this version",
      deepseekApiKeyLabel: "API key",
      deepseekHelp: "DeepSeek is the default. Change the service and model below if needed.",
      deepseekLink: "Get a DeepSeek key",
      deepseekHelpSuffix: ".",
      privacyNote: "Your key stays in this browser. Using an AI feature sends relevant captions to the chosen service and may incur charges.",
      saveSettings: "Save settings",
      localRemix: "Local remix",
      customizationTitle: "Want to use another AI model?",
      customizationPurpose: "Edit and copy a safe prompt for your coding agent",
      agentBadge: "Coding agent ready",
      customizationIntro:
        "You can edit the prompt directly. Complete these three steps before copying:",
      customizationStepFolder:
        "Open the extracted BiliMemo project folder in your coding agent.",
      customizationStepReplace:
        "Replace [PROVIDER] and [MODEL] with the service and model you want to use.",
      customizationStepKeys:
        "Never include API keys in the prompt or chat. Enter them yourself after the code is ready.",
      customizationPromptLabel: "Editable customization prompt",
      customizationReminderLabel: "Prompt reminder",
      customizationReminder:
        "Before copying, replace [PROVIDER] and [MODEL] with the provider and model you want to use.",
      customizationPrompt:
        "Customize this local BiliMemo workspace to use [PROVIDER] with [MODEL]. Work only in the current workspace. Before editing, verify that it contains manifest.json and that the manifest name is BiliMemo. If verification fails, stop and ask me to open the extracted BiliMemo project folder in my coding agent. Do not search other folders, edit a guessed copy, assume an installation path, or claim Chrome can reveal the absolute OS source path. Update the provider's API endpoint, request format, and minimum Chrome host permissions. Preserve bring-your-own-key and local Chrome storage. Never put API keys in source code, commits, logs, screenshots, this prompt, or chat; after the code is ready, tell me where to enter the key myself. Keep DeepSeek-only request fields and retry behavior isolated to DeepSeek. Handle provider-specific rules separately so one provider does not affect another. Update README.md, README.en.md, PRIVACY.md, SECURITY.md, and tests. Run npm test, npm run check, and npm run package. Then explain how to reload the unpacked extension and test it on a real YouTube video.",
      copyCustomizationPrompt: "Copy edited prompt",
      localData: "Local data",
      localDataHelp: "Caches and excerpts stay in this browser.",
      clearCache: "Clear cache",
      deleteNotes: "Delete all excerpts",
      resetData: "Reset extension data",
      footer: "Stored locally · <a href=\"PRIVACY.md\" target=\"_blank\">Privacy</a>",
      migrationWarning:
        "Custom provider settings were removed safely. Your Supadata key was kept, but the AI key was cleared. Enter a DeepSeek API key to continue.",
      saving: "Saving…",
      addSupadataKey: "Add a Supadata API key.",
      addDeepseekKey: "Add a DeepSeek API key.",
      saved: "Settings saved. You can test the connection now.",
      savedWithoutKey: "Settings saved. Original captions are ready to read.",
      saveFailed: ({ error }) => "Could not save settings: {error}".replace("{error}", error),
      copying: "Copying…",
      promptCopied: "Edited prompt copied.",
      copyFailed:
        "Could not copy the prompt. Select the prompt text and copy it manually.",
      clearedDigests: ({ count }) =>
        `Cleared ${count} cached digest${count === 1 ? "" : "s"}.`,
      notesDeleted: "Deleted all saved excerpts.",
      resetConfirm: "Delete API keys, cached captions, translations and saved excerpts from this browser?",
      allDataDeleted: "All BiliMemo data was deleted.",
      settingsLoadFailed: "Could not load settings. Reload this page before editing.",
    },
    "zh-CN": {
      biliReady: "B 站字幕，无需配置",
      biliReadyHelp: "阅读、搜索、播放同步和保存摘录，都不需要 API 密钥。",
      aiSectionHelp: "按需开启翻译、概览与解释。",
      keyPlaceholder: "填写你的 API 密钥",
      advancedSettings: "模型与服务地址",
      baseUrlLabel: "服务地址",
      baseUrlHelp: "填写兼容 Chat Completions 的 API 地址。",
      modelLabel: "模型名称",
      providerHelp: "更换服务后，请填写对应密钥；保存时可能需要允许访问该服务。",
      cacheTitle: "字幕与 AI 缓存",
      cacheHelp: "清除后按需重新获取，保留设置和摘录。",
      dataManagement: "删除摘录与重置",
      destructiveHelp: "这些操作无法撤销，请先导出需要的摘录。",
      loadingSettings: "正在读取设置…",
      unsavedHint: "修改尚未保存，请先保存再测试。测试会发起一次少量 AI 调用。",
      needKeyHint: "填写并保存 API 密钥后即可测试；只读原始字幕无需填写。",
      connectionHint: "测试使用已保存的配置，发起一次少量 AI 调用，可能产生费用。",
      connectionTestingHint: "正在测试已保存的配置，请稍候。",
      testConnection: "测试连接",
      testNeedsSave: "测试连接（需先保存）",
      testing: "测试中…",
      connectionSuccess: "连接成功，已保存的配置可以使用。",
      connectionFailed: ({ error }) => "连接失败：{error}".replace("{error}", error),
      connectionTimeout: "测试超时，请稍后重试。",
      connectionUnavailable: "请从已安装的扩展中打开此页进行测试。",
      permissionDenied: "未授权该模型服务地址。",
      externalSettingsChanged: "其他页面修改了设置，请重新保存本页配置后再测试。",
      notesConfirm: "确定删除全部摘录？此操作无法撤销，请先导出。",
      pageTitle: "BiliMemo 设置",
      languageGroupLabel: "界面语言",
      heading: "设置",
      lede: "原文阅读，直接开始。需要翻译或概览时，再配置 AI 服务。",
      transcriptProvider: "字幕服务",
      supadataApiKeyLabel: "Supadata API 密钥",
      supadataHelp: "仅 YouTube 字幕需要；B 站字幕无需 Supadata 密钥。",
      supadataLink: "创建 Supadata 账号并获取密钥",
      supadataHelpSuffix: "。Supadata 会在引导流程中生成密钥。",
      aiProvider: "AI 服务",
      providerSummaryLabel: "支持的 AI 服务",
      providerBadge: "当前版本支持",
      deepseekApiKeyLabel: "API 密钥",
      deepseekHelp: "默认使用 DeepSeek，也可以在下方更换服务与模型。",
      deepseekLink: "获取 DeepSeek 密钥",
      deepseekHelpSuffix: "。",
      privacyNote: "密钥保存在当前浏览器中。只有主动使用 AI 功能时，相关字幕才会发送给所选服务，并可能产生费用。",
      saveSettings: "保存设置",
      localRemix: "本地改造",
      customizationTitle: "想使用其他 AI 模型？",
      customizationPurpose: "编辑并复制一段可安全交给编程 Agent 的提示词",
      agentBadge: "可交给编程 Agent",
      customizationIntro: "你可以直接编辑提示词。复制前完成以下三步：",
      customizationStepFolder:
        "在编程 Agent 中打开 BiliMemo 解压后的项目文件夹。",
      customizationStepReplace:
        "把 [PROVIDER] 和 [MODEL] 替换成你想使用的服务和模型。",
      customizationStepKeys:
        "不要在提示词或聊天中加入 API 密钥。代码准备好后，请自行填写。",
      customizationPromptLabel: "可编辑的自定义提示词",
      customizationReminderLabel: "提示词提醒",
      customizationReminder:
        "复制前，请先把 [PROVIDER] 和 [MODEL] 替换成你想使用的服务和模型。",
      customizationPrompt:
        "请把当前本地 BiliMemo 工作区改为使用 [PROVIDER] 提供的 [MODEL]。只在当前工作区中操作。编辑前，先确认其中包含 manifest.json，且 manifest 中的 name 是 BiliMemo。如果验证失败，请停止，并让我在编程 Agent 中打开 BiliMemo 解压后的项目文件夹。不要搜索其他文件夹，不要编辑猜测的副本，不要假设安装路径，也不要声称 Chrome 可以显示操作系统中的绝对源码路径。更新该服务的 API endpoint、请求格式和最少的 Chrome host permissions。保留用户自带密钥模式和 Chrome 本地存储。不要把 API 密钥写入源代码、提交记录、日志、截图、这段提示词或聊天；代码准备好后，请告诉我应该在哪里自行填写密钥。DeepSeek 专用的请求参数和重试逻辑继续只用于 DeepSeek。新服务的专属规则请单独处理，避免相互影响。更新 README.md、README.en.md、PRIVACY.md、SECURITY.md 和测试。运行 npm test、npm run check 和 npm run package。最后，说明如何重新加载已解压的扩展，并在真实 YouTube 视频上测试。",
      copyCustomizationPrompt: "复制编辑后的提示词",
      localData: "本地数据",
      localDataHelp: "缓存与摘录保存在当前浏览器中。",
      clearCache: "清除缓存",
      deleteNotes: "删除全部摘录",
      resetData: "重置扩展数据",
      footer: "密钥与数据保留在本地 · <a href=\"PRIVACY.md\" target=\"_blank\">隐私说明</a>",
      migrationWarning:
        "已安全移除自定义服务设置。Supadata 密钥已保留，AI 密钥已清除。请输入 DeepSeek API 密钥以继续使用。",
      saving: "正在保存…",
      addSupadataKey: "请添加 Supadata API 密钥。",
      addDeepseekKey: "请添加 DeepSeek API 密钥。",
      saved: "设置已保存，可以测试连接。",
      savedWithoutKey: "设置已保存，可以直接阅读原始字幕。",
      saveFailed: ({ error }) => "保存失败：{error}".replace("{error}", error),
      copying: "正在复制…",
      promptCopied: "已复制编辑后的提示词。",
      copyFailed: "无法复制提示词。请选中提示词文本并手动复制。",
      clearedDigests: ({ count }) => `已清除 ${count} 条缓存摘要。`,
      notesDeleted: "已删除全部已保存的摘录。",
      resetConfirm: "要删除当前浏览器中的 API 密钥、字幕缓存、翻译和全部摘录吗？",
      allDataDeleted: "已删除全部 BiliMemo 数据。",
      settingsLoadFailed: "无法读取已保存设置，请刷新本页后再修改。",
    },
  };

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.has(language) ? language : "en";
  }

  function translate(language, key, params = {}) {
    const normalizedLanguage = normalizeLanguage(language);
    const value = COPY[normalizedLanguage][key] ?? COPY.en[key] ?? "";
    return typeof value === "function" ? value(params) : value;
  }

  function createStorageAdapter(chromeApi, fallbackStorage) {
    const chromeStorage = chromeApi?.storage?.local;
    const memoryStorage = new Map();

    function fallbackKeys() {
      const keys = [];
      if (!fallbackStorage) return keys;
      try {
        for (let index = 0; index < fallbackStorage.length; index += 1) {
          const key = fallbackStorage.key(index);
          if (key?.startsWith(PREVIEW_STORAGE_PREFIX)) keys.push(key);
        }
      } catch (_error) {
        return [];
      }
      return keys;
    }

    function readFallbackValue(key) {
      try {
        const rawValue = fallbackStorage?.getItem(
          `${PREVIEW_STORAGE_PREFIX}${key}`,
        );
        if (rawValue !== null && rawValue !== undefined) {
          return JSON.parse(rawValue);
        }
      } catch (_error) {
        // Fall through to memory when localStorage is unavailable or malformed.
      }
      return memoryStorage.get(key);
    }

    function writeFallbackValue(key, value) {
      memoryStorage.set(key, value);
      try {
        fallbackStorage?.setItem(
          `${PREVIEW_STORAGE_PREFIX}${key}`,
          JSON.stringify(value),
        );
      } catch (_error) {
        // The in-memory copy keeps a restricted preview functional.
      }
    }

    return {
      async get(keys) {
        if (chromeStorage) return chromeStorage.get(keys);

        const requestedKeys =
          keys === null
            ? [
                ...new Set([
                  ...memoryStorage.keys(),
                  ...fallbackKeys().map((key) =>
                    key.slice(PREVIEW_STORAGE_PREFIX.length),
                  ),
                ]),
              ]
            : Array.isArray(keys)
              ? keys
              : [keys];

        return Object.fromEntries(
          requestedKeys
            .map((key) => [key, readFallbackValue(key)])
            .filter(([, value]) => value !== undefined),
        );
      },

      async set(items) {
        if (chromeStorage) return chromeStorage.set(items);
        for (const [key, value] of Object.entries(items)) {
          writeFallbackValue(key, value);
        }
      },

      async remove(keys) {
        if (chromeStorage) return chromeStorage.remove(keys);
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          memoryStorage.delete(key);
          try {
            fallbackStorage?.removeItem(`${PREVIEW_STORAGE_PREFIX}${key}`);
          } catch (_error) {
            // Memory removal is sufficient for this preview session.
          }
        }
      },

      async clear() {
        if (chromeStorage) return chromeStorage.clear();
        memoryStorage.clear();
        for (const key of fallbackKeys()) {
          try {
            fallbackStorage.removeItem(key);
          } catch (_error) {
            // Continue clearing any remaining preview keys.
          }
        }
      },
    };
  }

  async function readPreferredLanguage(storage) {
    const stored = await storage.get(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored[LANGUAGE_STORAGE_KEY] ?? 'zh-CN');
  }

  async function persistPreferredLanguage(storage, language) {
    const normalizedLanguage = normalizeLanguage(language);
    await storage.set({ [LANGUAGE_STORAGE_KEY]: normalizedLanguage });
    return normalizedLanguage;
  }

  function updateLanguageButtonState(buttons, language) {
    const normalizedLanguage = normalizeLanguage(language);
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === normalizedLanguage),
      );
    }
  }

  function updateLocalizedPrompt(textarea, prompt) {
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectionDirection = textarea.selectionDirection;
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    textarea.value = prompt;

    if (
      Number.isInteger(selectionStart) &&
      Number.isInteger(selectionEnd) &&
      typeof textarea.setSelectionRange === "function"
    ) {
      textarea.setSelectionRange(
        Math.min(selectionStart, prompt.length),
        Math.min(selectionEnd, prompt.length),
        selectionDirection || "none",
      );
    }
    textarea.scrollTop = scrollTop;
    textarea.scrollLeft = scrollLeft;
  }

  function createPromptDrafts() {
    return {
      en: translate("en", "customizationPrompt"),
      "zh-CN": translate("zh-CN", "customizationPrompt"),
    };
  }

  function switchPromptDraft(
    drafts,
    currentLanguage,
    nextLanguage,
    currentValue,
  ) {
    const normalizedCurrentLanguage = normalizeLanguage(currentLanguage);
    const normalizedNextLanguage = normalizeLanguage(nextLanguage);
    drafts[normalizedCurrentLanguage] = String(currentValue ?? "");
    if (typeof drafts[normalizedNextLanguage] !== "string") {
      drafts[normalizedNextLanguage] = translate(
        normalizedNextLanguage,
        "customizationPrompt",
      );
    }
    return {
      language: normalizedNextLanguage,
      prompt: drafts[normalizedNextLanguage],
    };
  }

  async function copyPromptValue(clipboard, value) {
    await clipboard.writeText(value);
  }

  function getSafeLocalStorage(root) {
    try {
      return root.localStorage;
    } catch (_error) {
      return null;
    }
  }

  function initialize(root = globalThis) {
    const doc = root.document;
    const settingsApi = root.YTD_SETTINGS;
    if (!doc || !settingsApi) return;

    const storage = createStorageAdapter(
      root.chrome,
      getSafeLocalStorage(root),
    );
    const form = doc.getElementById("settingsForm");
    const aiApiKeyInput = doc.getElementById("aiApiKey");
    const supadataApiKeyInput = doc.getElementById("supadataApiKey");
    const customizationPrompt = doc.getElementById("customizationPrompt");
    const copyCustomizationPromptBtn = doc.getElementById(
      "copyCustomizationPromptBtn",
    );
    const copyStatus = doc.getElementById("copyStatus");
    const saveStatus = doc.getElementById("saveStatus");
    const dataStatus = doc.getElementById("dataStatus");
    const saveButton = doc.getElementById('saveSettingsBtn');
    const testButton = doc.getElementById('testConnectionBtn');
    const connectionStatus = doc.getElementById('connectionStatus');
    const fields = ['aiApiKey', 'aiBaseUrl', 'aiModel', 'supadataApiKey'];
    let savedSettings = null, ready = false, saving = false, testing = false, revision = 0;
    const languageButtons = [...doc.querySelectorAll("[data-language]")];
    const statusStates = new Map();
    const promptDrafts = createPromptDrafts();
    let currentLanguage = "en";

    function renderStatus(element) {
      const state = statusStates.get(element);
      element.textContent = state
        ? translate(currentLanguage, state.key, state.params)
        : "";
    }

    function setStatus(element, key, params = {}, tone = 'neutral') {
      statusStates.set(element, { key, params });
      element.dataset.tone = tone;
      renderStatus(element);
    }

    function clearStatus(element) {
      statusStates.delete(element);
      element.textContent = '';
    }

    function formValues() {
      return Object.fromEntries(fields.map(id => [id, doc.getElementById(id).value.trim()]));
    }

    function sameValues(a, b) {
      return Boolean(a && b) && fields.every(id => a[id] === b[id]);
    }

    function isDirty() { return !sameValues(formValues(), savedSettings); }

    function refreshActions() {
      const dirty = ready && isDirty();
      saveButton.disabled = !ready || saving || testing;
      saveButton.textContent = translate(currentLanguage, saving ? 'saving' : 'saveSettings');
      testButton.disabled = !ready || saving || testing || dirty || !savedSettings?.aiApiKey;
      testButton.textContent = translate(currentLanguage, testing ? 'testing' : dirty ? 'testNeedsSave' : 'testConnection');
      const hint = !ready ? 'loadingSettings' : testing ? 'connectionTestingHint' : dirty ? 'unsavedHint' :
        !savedSettings?.aiApiKey ? 'needKeyHint' : 'connectionHint';
      doc.getElementById('connectionHint').textContent = translate(currentLanguage, hint);
      for (const id of ['clearCacheBtn', 'clearNotesBtn', 'resetBtn']) doc.getElementById(id).disabled = !ready || saving || testing;
    }

    function applyLanguage(language) {
      const nextDraft = switchPromptDraft(
        promptDrafts,
        currentLanguage,
        language,
        customizationPrompt.value,
      );
      currentLanguage = nextDraft.language;
      doc.documentElement.lang = currentLanguage;
      doc.title = translate(currentLanguage, "pageTitle");

      for (const element of doc.querySelectorAll("[data-i18n]")) {
        element.textContent = translate(
          currentLanguage,
          element.dataset.i18n,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-html]")) {
        element.innerHTML = translate(
          currentLanguage,
          element.dataset.i18nHtml,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-aria-label]")) {
        element.setAttribute(
          "aria-label",
          translate(currentLanguage, element.dataset.i18nAriaLabel),
        );
      }
      for (const element of doc.querySelectorAll('[data-i18n-placeholder]')) {
        element.placeholder = translate(currentLanguage, element.dataset.i18nPlaceholder);
      }

      updateLocalizedPrompt(
        customizationPrompt,
        nextDraft.prompt,
      );
      updateLanguageButtonState(languageButtons, currentLanguage);
      for (const element of statusStates.keys()) renderStatus(element);
      refreshActions();
    }

    async function loadSettings() {
      ready = false;
      refreshActions();
      fields.forEach(id => { doc.getElementById(id).disabled = true; });
      clearStatus(connectionStatus);
      try {
        const stored = await storage.get(settingsApi.STORAGE_KEY);
        const migration = settingsApi.migrateLegacyCustom(
          stored[settingsApi.STORAGE_KEY],
        );
        const settings = migration.settings;

        doc.getElementById('aiBaseUrl').value = settings.aiBaseUrl;
        doc.getElementById('aiModel').value = settings.aiModel;
        aiApiKeyInput.value = settings.aiApiKey;
        supadataApiKeyInput.value = settings.supadataApiKey;
        if (migration.migrated) {
          await storage.set({ [settingsApi.STORAGE_KEY]: settings });
          setStatus(saveStatus, "migrationWarning");
        }
        savedSettings = settings;
        ready = true;
        fields.forEach(id => { doc.getElementById(id).disabled = false; });
      } catch (_error) {
        setStatus(saveStatus, "settingsLoadFailed", {}, 'error');
      } finally {
        refreshActions();
        if (!ready) doc.getElementById('connectionHint').textContent = translate(currentLanguage, 'settingsLoadFailed');
      }
    }

    async function loadOptions() {
      try {
        applyLanguage(await readPreferredLanguage(storage));
      } catch (_error) {
        applyLanguage("zh-CN");
      }
      await loadSettings();
    }

    async function saveSettings(event) {
      event.preventDefault();
      if (!ready || saving || testing) return;
      saving = true;
      const savedRevision = revision;
      clearStatus(connectionStatus);
      setStatus(saveStatus, "saving");
      refreshActions();

      try {
        const settings = settingsApi.normalize({ schemaVersion: 2, ...formValues() });
        const url = new URL(settings.aiBaseUrl);
        if (root.chrome?.permissions && url.hostname !== 'api.deepseek.com') {
          const granted = await root.chrome.permissions.request({ origins: [url.protocol + '//' + url.hostname + '/*'] });
          if (!granted) throw new Error(translate(currentLanguage, 'permissionDenied'));
        }
        await storage.set({ [settingsApi.STORAGE_KEY]: settings });
        savedSettings = settings;
        if (revision === savedRevision) {
          fields.forEach(id => { doc.getElementById(id).value = settings[id]; });
          setStatus(saveStatus, settings.aiApiKey ? 'saved' : 'savedWithoutKey', {}, 'success');
        } else {
          setStatus(saveStatus, 'unsavedHint');
        }
      } catch (error) {
        setStatus(saveStatus, "saveFailed", { error: error.message }, 'error');
      } finally {
        saving = false;
        refreshActions();
      }
    }

    async function testConnection() {
      if (!ready || saving || testing || isDirty() || !savedSettings?.aiApiKey) return;
      testing = true;
      const testedRevision = revision;
      let timeout;
      clearStatus(saveStatus);
      setStatus(connectionStatus, 'testing');
      refreshActions();
      try {
        // The worker tests stored settings. Verify they still match this form
        // before sending a request, including edits saved in another options tab.
        const stored = await storage.get(settingsApi.STORAGE_KEY);
        const latest = settingsApi.normalize(stored[settingsApi.STORAGE_KEY]);
        if (revision !== testedRevision) return;
        if (!sameValues(latest, savedSettings)) {
          savedSettings = latest;
          setStatus(connectionStatus, 'externalSettingsChanged');
          return;
        }
        if (!root.chrome?.runtime?.sendMessage) throw new Error(translate(currentLanguage, 'connectionUnavailable'));
        const result = await Promise.race([
          root.chrome.runtime.sendMessage({ action: 'testAiConnection' }),
          new Promise((_, reject) => { timeout = root.setTimeout(() => reject(new Error(translate(currentLanguage, 'connectionTimeout'))), 135000); }),
        ]);
        if (revision !== testedRevision) return;
        const after = await storage.get(settingsApi.STORAGE_KEY);
        const afterSettings = settingsApi.normalize(after[settingsApi.STORAGE_KEY]);
        if (revision !== testedRevision) return;
        if (!sameValues(afterSettings, savedSettings)) {
          savedSettings = afterSettings;
          setStatus(connectionStatus, 'externalSettingsChanged');
          return;
        }
        if (!result?.success) throw new Error(result?.error || translate(currentLanguage, 'connectionUnavailable'));
        setStatus(connectionStatus, 'connectionSuccess', {}, 'success');
      } catch (error) {
        if (revision === testedRevision) setStatus(connectionStatus, 'connectionFailed', { error: error.message }, 'error');
      } finally {
        root.clearTimeout(timeout);
        testing = false;
        refreshActions();
      }
    }

    async function copyCustomizationPrompt() {
      setStatus(copyStatus, "copying");
      try {
        await copyPromptValue(
          root.navigator.clipboard,
          customizationPrompt.value,
        );
        setStatus(copyStatus, "promptCopied");
      } catch (_error) {
        setStatus(copyStatus, "copyFailed");
      }
    }

    async function clearCachedDigests() {
      if (!ready || saving || testing) return;
      const all = await storage.get(null);
      const keys = Object.keys(all).filter((key) => key.startsWith("digest_") || key.startsWith("study_ai_"));
      if (keys.length) await storage.remove(keys);
      setStatus(dataStatus, "clearedDigests", { count: keys.length });
    }

    async function clearNotes() {
      if (!ready || saving || testing) return;
      if (!root.confirm(translate(currentLanguage, 'notesConfirm'))) return;
      await storage.remove("ytd_notes");
      setStatus(dataStatus, "notesDeleted");
    }

    async function resetAllData() {
      if (!ready || saving || testing) return;
      const confirmed = root.confirm(
        translate(currentLanguage, "resetConfirm"),
      );
      if (!confirmed) return;

      await storage.clear();
      revision++;
      clearStatus(saveStatus);
      await persistPreferredLanguage(storage, currentLanguage);
      await loadSettings();
      setStatus(dataStatus, "allDataDeleted");
    }

    testButton.addEventListener('click', testConnection);
    form.addEventListener('input', event => {
      if (!fields.includes(event.target.id)) return;
      revision++;
      clearStatus(saveStatus);
      clearStatus(connectionStatus);
      refreshActions();
    });
    const version = root.chrome?.runtime?.getManifest?.().version;
    doc.getElementById('settingsVersion').textContent = version ? `v${version}` : '';
    form.addEventListener("submit", saveSettings);
    copyCustomizationPromptBtn.addEventListener(
      "click",
      copyCustomizationPrompt,
    );
    doc
      .getElementById("clearCacheBtn")
      .addEventListener("click", clearCachedDigests);
    doc.getElementById("clearNotesBtn").addEventListener("click", clearNotes);
    doc.getElementById("resetBtn").addEventListener("click", resetAllData);
    for (const button of languageButtons) {
      button.addEventListener("click", async () => {
        const language = button.dataset.language;
        applyLanguage(language);
        await persistPreferredLanguage(storage, language);
      });
    }

    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", loadOptions, { once: true });
    } else {
      void loadOptions();
    }
  }

  return {
    COPY,
    LANGUAGE_STORAGE_KEY,
    copyPromptValue,
    createPromptDrafts,
    createStorageAdapter,
    normalizeLanguage,
    persistPreferredLanguage,
    readPreferredLanguage,
    translate,
    updateLanguageButtonState,
    updateLocalizedPrompt,
    switchPromptDraft,
    initialize,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_OPTIONS;
}

if (typeof document !== "undefined") {
  YTD_OPTIONS.initialize();
}
