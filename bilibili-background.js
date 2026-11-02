/* Background-only adapter for the MIT-licensed biuworks Bilibili API client.
 * Subtitle retrieval never executes scripts in the video page. */
var DIGEST_BILI_BACKGROUND = (() => {
  const api = typeof BILI_API !== 'undefined' ? BILI_API : require('./vendor/bilibili-digest/bili-api.js');
  const video = typeof DIGEST_VIDEO !== 'undefined' ? DIGEST_VIDEO : require('./platforms.js');
  const apiPaths = new Set(['/x/web-interface/view','/x/web-interface/nav','/x/player/wbi/v2','/x/v2/subtitle/web/view']);
  const captionHosts = new Set(['aisubtitle.hdslb.com','i0.hdslb.com','i1.hdslb.com','i2.hdslb.com','subtitle.bilibili.com']);
  const fail = (error,message) => ({success:false,error,message});

  function checkedFetch(fetchImpl, forceRefresh = false) {
    return async (input, options = {}) => {
      const url = new URL(input);
      const isApi = url.hostname === 'api.bilibili.com' && apiPaths.has(url.pathname);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || (!isApi && !captionHosts.has(url.hostname))) {
        const error = new Error('字幕服务返回了不受支持的地址，已停止读取。'); error.code='BILI_SUBTITLE_HOST'; throw error;
      }
      // The browser attaches the Bilibili session. No cookies are read or copied.
      return fetchImpl(url.href, {...options,...(forceRefresh ? {cache:'no-store'} : {}),credentials:isApi?'include':'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
    };
  }

  async function read(videoId, includeTranscript = true, trackId = null, {fetchImpl = fetch, forceRefresh = false} = {}) {
    const identity = video.fromId(videoId);
    if (identity?.platform !== 'bilibili') return fail('INVALID_BVID','无法识别当前 B 站视频。');
    const request = checkedFetch(fetchImpl, forceRefresh);
    let info;
    try {
      const metadata = await api.fetchVideoInfo(identity.video,{fetchImpl:request,page:identity.part});
      info = {title:metadata.title,channelName:metadata.owner,description:metadata.description,duration:metadata.duration};
      if (!includeTranscript) return {success:true,info};
      const listed = await api.fetchSubtitleTracks(metadata,{fetchImpl:request});
      if (!listed.tracks.length) return {...fail(listed.needLogin?'BILI_NEED_LOGIN':'BILI_NO_SUBTITLE',listed.needLogin
        ? '该视频字幕需要 B 站登录会话，请先正常登录 B 站再重试。'
        : 'B 站未返回可读 CC 字幕；仅烧录在视频画面里的字幕暂不支持。'),info};
      const selected = trackId ? listed.tracks.find(t=>String(t.id || t.lang)===String(trackId))
        : api.pickSubtitleTrack(listed.tracks,undefined,{ownerMid:metadata.ownerMid});
      if (!selected) return fail('BILI_TRACK_MISSING','这条字幕轨已不可用，请重新打开视频后选择其他字幕。');
      // With an explicit selection, never silently switch to a different language.
      const candidates=trackId?[selected]:[selected,...listed.tracks.filter(t=>t!==selected)];
      let transcript, chosen, lastError;
      for (const track of candidates) {
        try {
          const rows=await api.fetchSubtitleTrackContent(track.url,{fetchImpl:request});
          if(rows.length){transcript=rows;chosen=track;break;}
        }catch(error){lastError=error;}
      }
      if(!transcript?.length){if(lastError)throw lastError;return {...fail('EMPTY_TRANSCRIPT','字幕轨存在，但平台返回的正文为空。请在播放器确认字幕可见后重试。'),info};}
      const format = seconds => {const n=Math.floor(seconds);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
      return {success:true,info,transcript,language:chosen.lang,
        tracks:listed.tracks.map(t=>({id:String(t.id || t.lang),name:t.langLabel,ai:t.isAi})),
        source:{version:3,videoId,bvid:metadata.bvid,aid:String(metadata.aid),cid:String(metadata.cid),part:identity.part,
          trackId:String(chosen.id || chosen.lang),endpoint:listed.endpoint,transport:'background'},
        transcriptText:transcript.map(r=>r.text).join(' '),
        transcriptTextTimestamped:transcript.map(r=>`[${format(r.start)}] ${r.text}`).join('\n')};
    }catch(error){
      return {...fail(error.code || 'BILI_NETWORK_ERROR',error.name==='TimeoutError'?'B 站字幕服务响应超时，请稍后重试。'
        : error.code ? error.message : '后台访问 B 站字幕服务失败，请检查网络后重试。'),info};
    }
  }
  return {read,checkedFetch};
})();
if(typeof module!=='undefined')module.exports=DIGEST_BILI_BACKGROUND;
