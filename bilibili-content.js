(() => {
  // Reinjection must replace a stale receiver, not stop at an old loaded flag.
  globalThis.__digestBiliController?.dispose();
  document.getElementById?.('bili-digest-controls')?.remove();
  const current = () => DIGEST_VIDEO.parse(location.href);
  // Separate queries preserve priority: a comma selector alone returns the
  // first DOM match, which can be an unrelated preview before the main player.
  const media = () => document.querySelector('.bpx-player-video-wrap video, .bpx-player-video-wrap bwp-video')
    || document.querySelector('#bilibili-player video, #bilibili-player bwp-video')
    || document.querySelector('video, bwp-video');

  function playbackState() {
    const player = media();
    if (player && Number.isFinite(player.currentTime) && player.currentTime >= 0 &&
        (player.readyState === undefined || player.readyState > 0)) {
      return { success: true, currentTime: player.currentTime, paused: player.paused ?? null, source: 'media', videoId: current()?.id };
    }
    // Custom bwp-video JS properties may be invisible to an isolated content
    // script. The player's displayed clock is shared DOM and needs no MAIN
    // world injection. It has whole-second precision, unlike a native video.
    const clock = document.querySelector('.bpx-player-ctrl-time-current, .bilibili-player-video-time-now');
    const text = clock?.textContent?.trim() || '';
    if (/^(?:\d+:)?\d{1,3}:[0-5]\d$/.test(text)) {
      const fields = text.split(':').map(Number);
      if (fields.length === 2 || fields[1] < 60) {
        return { success: true, currentTime: fields.reduce((seconds, part) => seconds * 60 + part, 0), paused: null, source: 'clock', videoId: current()?.id };
      }
    }
    return { success: false, error: 'PLAYER_TIME_UNAVAILABLE' };
  }
  let lastVideoId = null;
  let buttons;
  let status;
  let statusTimer;
  let positionFrame = 0;

  function positionControls() {
    if (!buttons?.isConnected) return;
    const actions = document.querySelector('.video-toolbar-left');
    if (!current() || !actions || document.fullscreenElement) {
      buttons.hidden = true;
      return;
    }
    const anchor = actions.getBoundingClientRect();
    const style = getComputedStyle(actions);
    if (!anchor.width || !anchor.height || anchor.bottom <= 0 || anchor.top >= innerHeight ||
        style.visibility === 'hidden' || style.display === 'none') {
      buttons.hidden = true;
      return;
    }
    const row = actions.parentElement.getBoundingClientRect();
    const right = actions.parentElement.querySelector('.video-toolbar-right')?.getBoundingClientRect();
    const boundary = Math.min(innerWidth, row.right, right?.width > 0 ? right.left : Infinity);
    let left = anchor.right + 12;
    buttons.hidden = false;
    buttons.toggleAttribute('data-compact', false);
    let size = buttons.getBoundingClientRect();
    const compact = left + size.width > boundary - 8;
    if (compact) {
      // Preserve the primary entry in tight layouts without moving native
      // controls. The excerpt shortcut is still available inside the panel.
      buttons.toggleAttribute('data-compact', true);
      left = anchor.right + 4;
      size = buttons.getBoundingClientRect();
    }
    const limit = boundary - (compact ? 2 : 8);
    const top = anchor.top + (anchor.height - size.height) / 2;
    // If the native row has no spare room, leave it unobstructed. The browser
    // toolbar icon remains available, including in fullscreen.
    if (left < 0 || left + size.width > limit || top < 0 || top + size.height > innerHeight) {
      buttons.hidden = true;
      return;
    }
    buttons.style.left = `${Math.round(left)}px`;
    buttons.style.top = `${Math.round(top)}px`;
  }

  function schedulePosition() {
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionControls();
    });
  }

  function info() {
    return {
      title: document.querySelector("h1.video-title, h1")?.textContent?.trim() || "",
      channelName: document.querySelector(".up-name, .up-detail .up-name")?.textContent?.trim() || "",
      description: document.querySelector(".basic-desc-info, .video-desc")?.textContent?.trim() || "",
      duration: Number(media()?.duration) || 0,
    };
  }
  function feedback(text) {
    if (!status) return;
    status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { if (status) status.textContent = ""; }, 5000);
  }
  async function saveNote() {
    const video = current();
    if (!video) return;
    const playback = playbackState();
    if (!playback.success) {
      feedback("暂时读不到播放时间，请稍后再点摘录。");
      return;
    }
    feedback("保存中…");
    try {
      const metadata = info();
      const result = await chrome.runtime.sendMessage({ action: "saveNote", videoId: video.id,
        timestamp: playback.currentTime, timeSource: playback.source,
        videoTitle: metadata.title, channelName: metadata.channelName });
      feedback(result.success ? "摘录已保存" : (result.message || result.error || "保存失败，请重试"));
    } catch { feedback("扩展已更新，请刷新页面。"); }
  }
  function reconcile() {
    const video = current();
    if (!video) {
      buttons?.remove(); buttons = null; status = null; lastVideoId = null;
      return;
    }
    if (video.id !== lastVideoId) {
      lastVideoId = video.id;
      feedback("");
      chrome.runtime.sendMessage({ action: "videoPageChanged", videoId: video.id }).catch(() => {});
    }
    // The action row belongs to Bilibili's server-rendered app. Inserting even
    // a sibling there before hydration can abort initialization of comments
    // and lazy images. Keep our DOM outside the app and only read its geometry.
    const actions = document.querySelector('.video-toolbar-left');
    if (!actions) {
      buttons?.remove();
      return;
    }
    if (buttons) {
      if (buttons.parentElement !== document.body) document.body.append(buttons);
      positionControls();
      return;
    }
    buttons = document.createElement("div");
    buttons.id = "bili-digest-controls";
    buttons.hidden = true;
    const shadow = buttons.attachShadow({ mode: "open" });
    // The host lives outside the app; shadow styles isolate its descendants.
    const style = document.createElement("style");
    style.textContent = `:host{display:block;position:fixed!important;left:-10000px;top:0;z-index:10;
      margin:0!important;padding:0!important;width:max-content;font:14px system-ui,-apple-system,"Microsoft YaHei",sans-serif}
      :host([hidden]){display:none!important}
      :host([data-compact]) .save-note{display:none}
      :host([data-compact]) .open-caption{padding:0 10px;letter-spacing:0}
      .controls{display:flex;align-items:center;gap:4px}
      button{box-sizing:border-box;height:36px;padding:0 16px;border:0;border-radius:10px;
        background:#0087bd;color:#fff;cursor:pointer;white-space:nowrap;font:500 14px/20px "PingFang SC","Microsoft YaHei",sans-serif}
      .open-caption{min-width:64px;letter-spacing:1px}
      button:hover{background:#0076a7}button:active{background:#006b98}
      button:focus-visible{outline:2px solid #0087bd;outline-offset:3px}
      .save-note{display:grid;place-items:center;width:32px;padding:0;background:transparent;color:var(--text2,#61666d)}
      .save-note:hover,.save-note:active{background:#eaf6fc;color:#0076a7}
      .save-note svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      [role=status]{position:absolute;top:calc(100% + 8px);left:0;z-index:10;width:max-content;
        max-width:240px;box-sizing:border-box;white-space:normal;line-height:1.5;color:#333;background:#fff;
        border:1px solid #e3e8ed;border-radius:6px;pointer-events:none}
      [role=status]:empty{display:none}[role=status]:not(:empty){padding:8px 12px;box-shadow:0 2px 8px #0001}`;
    const controls = document.createElement("div"); controls.className = "controls";
    const open = document.createElement("button"); open.textContent = "AI总结"; open.type = "button"; open.className = "open-caption";
    open.title = "打开概览、摘录与字幕；点击生成才会调用 AI";
    open.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openSidePanel" }).then(result => {
        if (!result?.success) feedback(result?.error || "请点击浏览器工具栏的扩展图标打开侧栏。");
      }).catch(() => feedback("请刷新页面后重试。"));
    });
    const note = document.createElement("button"); note.type = "button"; note.className = "save-note";
    note.title = "保存当前片段到摘录"; note.setAttribute("aria-label", "保存摘录");
    note.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1Z"/><path d="M9 9h6m-3-3v6"/></svg>';
    note.addEventListener("click", saveNote);
    status = document.createElement("span"); status.setAttribute("role", "status");
    controls.append(open, note); shadow.append(style, controls, status); document.body.append(buttons);
    positionControls();
  }
  const onMessage = (message, _sender, respond) => {
    if (!current() || (message.videoId && message.videoId !== current().id)) {
      respond({ success: false, error: "VIDEO_CHANGED" }); return false;
    }
    const player = media();
    switch (message.action) {
      case "getVideoInfo": respond(info()); break;
      case "getCurrentTime": respond(playbackState()); break;
      case "seekTo": {
        if (!player || !Number.isFinite(message.seconds) || message.seconds < 0) {
          respond({ success: false, error: "PLAYER_UNAVAILABLE" }); break;
        }
        // A page-owned bwp-video can expose only its display clock here.
        // Assigning an invisible property would create a private, frozen clock
        // in the extension and make subsequent bookmarks use the seek target.
        if (!Number.isFinite(player.currentTime)) {
          location.assign(DIGEST_VIDEO.url(current().id, message.seconds));
          respond({ success: true }); break;
        }
        player.currentTime = message.seconds;
        if (player.paused) Promise.resolve(player.play()).catch(() => {});
        respond({ success: true }); break;
      }
      case "highlightMoments": respond({ success: true }); break;
      case "showNoteSavedFeedback": feedback("摘录已保存"); respond({ success: true }); break;
      default: respond({ success: false, error: "Unknown action" });
    }
    return false;
  };
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('scroll', schedulePosition, {capture:true, passive:true});
  window.addEventListener('resize', schedulePosition, {passive:true});
  document.addEventListener('fullscreenchange', schedulePosition);
  reconcile();
  // Detect both SPA video changes and p= changes; also recover removed controls.
  const interval = setInterval(reconcile, 750);
  globalThis.__digestBiliController = {
    dispose() {
      if (typeof clearInterval === 'function') clearInterval(interval);
      clearTimeout(statusTimer);
      cancelAnimationFrame(positionFrame);
      window.removeEventListener('scroll', schedulePosition, true);
      window.removeEventListener('resize', schedulePosition);
      document.removeEventListener('fullscreenchange', schedulePosition);
      try { chrome.runtime.onMessage.removeListener?.(onMessage); } catch {}
      buttons?.remove();
    }
  };
})();
