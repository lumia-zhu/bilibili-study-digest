// Real DOM/rendering with deterministic captions and AI responses. No external requests.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try {
 const context=await browser.newContext({viewport:{width:360,height:740}});
 await context.route('**/*',route=>{
   const u=new URL(route.request().url()), name=u.pathname.slice(1)||'sidepanel.html';
   if(u.hostname==='digest.test' && /^[\w./-]+$/.test(name) && !name.includes('..') && fs.existsSync(path.join(root,name))) {
     const type=name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/plain';
     return route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:type});
   }
   return route.abort();
 });
 await context.addInitScript(({version})=>{
   const values={}, listeners=[];
   const event={addListener:f=>listeners.push(f),removeListener:()=>{}};
   const videoId='bili:BV1a6Yx62EH4:p1';
   const api=window.__api={calls:[],paid:0,cache:{},failNext:false,track:'zh',delay:0,notes:[],count:14,time:0};
   function rows(){return Array.from({length:api.count},(_,i)=>({text:api.track==='zh'?`第 ${i+1} 节：学习时先读原始字幕，核对视频中的依据，再决定是否需要 AI 整理与概览。`:`Lesson ${i+1}: Read the original source and check the evidence before using an AI summary.`,start:i*32,duration:30}));}
   const local={get:async keys=>keys===null?{...values}:Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,values[k]])),set:async v=>Object.assign(values,v),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete values[k]),clear:async()=>Object.keys(values).forEach(k=>delete values[k])};
   const sendMessage=async m=>{
     api.calls.push(m);
     if(m.action==='repairPlaybackConnection'){api.connectionError=false;return {success:true};}
     if(m.action==='relayToContent') return {success:true,response:m.payload.action==='getCurrentTime'?{currentTime:api.time,paused:true}:{title:'学习视频示例：先理解原文，再按需使用 AI',channelName:'测试字幕 · 模拟数据',duration:7200}};
     if(m.action==='fetchTranscript') {
       api.track=m.trackId||'zh';const transcript=rows();
       const result=api.fetchFailure||api.fetchResult||{success:true,transcript,transcriptText:transcript.map(r=>r.text).join('\n'),transcriptTextTimestamped:'fixture',language:api.track,source:{version:2,videoId,part:1,cid:'123',bvid:'BV1a6Yx62EH4',endpoint:'wbi/v2',trackId:api.track},tracks:[{id:'zh',name:'中文',ai:true},{id:'en',name:'English',ai:false}]};
       if(api.fetchDelay)await new Promise(r=>setTimeout(r,api.fetchDelay));
       api.lastFetchResult=result;return result;
     }
     if(m.action==='getNotes') return {success:true,notes:api.notes};
     if(m.action==='saveNote'){const note={id:String(api.notes.length),text:m.selectedText,videoId,videoTitle:'学习视频',timestamp:'0:00',timestampedUrl:'https://www.bilibili.com/video/BV1a6Yx62EH4/?t=0',createdAt:Date.now()};api.notes.push(note);return {success:true,note};}
     if(m.action==='studyAiBatch') {
       const key=JSON.stringify([m.kind,m.rows]); if(!m.force&&api.cache[key])return {success:true,cached:true,value:api.cache[key]};
       api.paid++;if(api.delay)await new Promise(r=>setTimeout(r,api.delay));
       if(api.failNext){api.failNext=false;return {success:false,error:'模拟 429：稍后重试'};}
       const value=m.kind==='cleanup'?STUDY.validateCleanup({groups:[{ids:m.rows.map(r=>r.id),text:m.rows.map(r=>r.text).join(' ')}]},m.rows):STUDY.validateOverview({topic:'先核对证据，再提炼要点',takeaways:['保留原始字幕，按需生成概览。','整理只能改善阅读，不能代替核对。'],chapters:[{startId:m.rows[0].id,endId:m.rows.at(-1).id,title:'阅读原文与核对依据',summary:'原始字幕先展示，用户按需决定是否整理。'+ '长段落也应该完整显示，可以滚动阅读与折叠。'.repeat(12)}],keyQuotes:[{sourceId:m.rows[0].id,quote:m.rows[0].text}]},m.rows);
       api.cache[key]=value;return {success:true,cached:false,value};
     }
     if(m.action==='translateContent') {api.paid++;return {success:true,translatedContent:{segments:m.content.segments.map(r=>({id:r.id,text:'中文译文：'+r.text}))}};}
     return {success:true};
   };
   window.chrome={storage:{local,session:local},runtime:{sendMessage,onMessage:event,getURL:s=>'http://digest.test/'+s,getManifest:()=>({version})},windows:{getCurrent:async()=>({id:1})},tabs:{query:async()=>[{id:1,url:'https://www.bilibili.com/video/BV1a6Yx62EH4/',active:true,windowId:1}],get:async()=>({id:1,url:'https://www.bilibili.com/video/BV1a6Yx62EH4/'}),onUpdated:event,onActivated:event,sendMessage:async(_id,m)=>{if(api.connectionError)throw Error('Receiving end does not exist.');return m.action==='getCurrentTime'?{success:true,currentTime:api.time,paused:true}:{success:true};},create:async()=>({})},permissions:{request:async()=>{api.permissionGranted=true;return true;},contains:async()=>!api.connectionError||!!api.permissionGranted}};
 }, {version});
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://digest.test/sidepanel.html');
 await page.locator('#transcriptList .transcript-entry').first().waitFor();
 assert.equal(await page.locator('#transcriptList .transcript-entry').count(),14);
 assert.equal(await page.evaluate(()=>__api.paid),0);
 await page.evaluate(()=>{__api.connectionError=true;});
 await page.waitForFunction(()=>document.getElementById('playbackStatus').textContent.includes('PAGE_ACCESS_REQUIRED'));
 await page.getByRole('button',{name:'重新连接播放',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='0');
 assert.equal(await page.locator('#playbackDiagnostics').isVisible(),false);
 assert.equal(await page.evaluate(()=>__api.paid),0);
 await page.evaluate(()=>{__api.time=65;});
 await page.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='64');
 await page.locator('#contentArea').dispatchEvent('wheel',{deltaY:-120});
 await page.evaluate(()=>{__api.time=321;});
 await page.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='320');
 assert.equal(await page.evaluate(()=>autoScrollEnabled),false);
 await page.getByRole('button',{name:'回到播放位置'}).click();
 assert.equal(await page.evaluate(()=>autoScrollEnabled),true);
 await page.evaluate(()=>{__api.time=0;});
 await page.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='0');
 assert.equal(await page.evaluate(()=>__api.paid),0);
 await page.click('[data-tab=overview]');assert.equal(await page.evaluate(()=>__api.paid),0);
 await page.click('[data-tab=transcript]');
 await page.fill('#transcriptSearchInput','第 2 节');
 await page.locator('mark').first().waitFor();
 await page.fill('#transcriptSearchInput','');
 // Cleanup is intentionally unavailable; hiding the UI must not leave a paid path.
 for (const id of ['rawModeBtn','cleanModeBtn','cleanTranscriptBtn','stopStudyBtn','studyTaskControls','studyStatus']) assert.equal(await page.locator('#'+id).isVisible(),false,id);
 await page.evaluate(()=>runStudyTask('cleanup'));
 assert.equal(await page.evaluate(()=>__api.paid),0);
 assert.equal(await page.evaluate(()=>__api.calls.some(m=>m.action==='studyAiBatch')),false);
 assert.equal(await page.locator('#transcriptList .transcript-entry').count(),14);
 await page.locator('#contentArea').evaluate(el=>el.scrollTop=0);
 await page.screenshot({animations:'disabled',path:path.join(root,'dist','reader-preview.png')});
 // Long source, one failed batch, retry from cached successes, no silent truncation.
 await page.evaluate(()=>{__api.count=330;__api.failNext=true;currentTranscript=Array.from({length:330},(_,i)=>({text:`字幕${i}。`+'完整保留这段学习材料，避免概览遗漏结尾。'.repeat(3),start:i*20,duration:20}));studyState.key='';renderTranscript();});
 await page.click('[data-tab=overview]');await page.click('#generateOverviewBtn');await page.waitForFunction(()=>!studyState.busy);
 assert.ok(await page.evaluate(()=>currentAnalysis.completed<currentAnalysis.total));
 const before=await page.evaluate(()=>__api.paid);await page.click('#generateOverviewBtn');await page.waitForFunction(()=>!studyState.busy);
 assert.equal(await page.evaluate(()=>__api.paid),before+1);
 assert.equal(await page.evaluate(()=>currentAnalysis.chapters.at(-1).endSeconds),6600);
 assert.equal(await page.evaluate(()=>currentAnalysis.completed),await page.evaluate(()=>currentAnalysis.total));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#chapterList details').last().scrollIntoViewIfNeeded();
 assert.ok(await page.locator('#chapterList details p').last().isVisible());
 await page.screenshot({path:path.join(root,'dist','overview-preview.png')});
 await page.locator('#contentArea').evaluate(el=>el.scrollTop=0);
 await page.screenshot({animations:'disabled',path:path.join(root,'dist',`overview-ui-v${version}.png`)});
 await page.click('#quotesList button:last-child');await page.waitForFunction(()=>__api.notes.length>0);
 // Track switching clears stale overview and preserves the raw-first rule.
 await page.selectOption('#subtitleTrack','en');await page.waitForFunction(()=>currentTranscriptLanguage==='en');
 assert.equal(await page.evaluate(()=>currentAnalysis),null);
 assert.equal(await page.evaluate(()=>currentTranscriptMode),'original');
 await page.click('[data-tab=transcript]');
 await page.click('[data-transcript-mode=bilingual]');await page.waitForFunction(()=>transcriptParagraphCache.size>0);
 await page.click('[data-tab=notes]');await page.locator('#notesList .note-text').first().waitFor();
 assert.doesNotMatch(await page.locator('#notesList').innerText(),/Translating|Waiting for translation/);
 await page.screenshot({animations:'disabled',path:path.join(root,'dist',`notes-ui-v${version}.png`)});
 await page.click('[data-tab=transcript]');
 let confirmation=false;page.once('dialog',async d=>{confirmation=true;await d.dismiss();});await page.click('#exportTranscriptBtn');assert.equal(confirmation,true);
 await page.click('[data-transcript-mode=original]');
 await page.click('#translateAllBtn');await page.waitForFunction(()=>!studyState.busy);
 assert.equal(await page.evaluate(()=>getActiveTranscriptSegments().every(s=>transcriptParagraphCache.has(transcriptTranslationCacheKey(s)))),true);
 assert.equal(await page.locator('#stopStudyBtn').isVisible(),false);
 // Stop allows the in-flight batch to settle but sends no subsequent batches.
 await page.evaluate(()=>{__api.cache={};__api.delay=150;});
 await page.click('[data-tab=overview]');await page.click('#generateOverviewBtn');await page.click('#stopStudyBtn');await page.waitForFunction(()=>!studyState.busy);
 assert.match(await page.locator('#studyStatus').innerText(),/已停止/);
 assert.equal(await page.locator('#stopStudyBtn').isVisible(),false);
 await page.click('[data-tab=transcript]');
 await page.evaluate(async()=>{
   await chrome.storage.local.clear();currentAnalysis=null;
   __api.fetchFailure={success:false,error:'BILI_PAGE_PERMISSION',message:'浏览器拒绝访问页面',detail:'Cannot access contents of url'};
   await startDigest(currentVideoId,currentVideoUrl);
 });
 assert.equal(await page.locator('#errorTitle').innerText(),'无法访问视频页面');
 assert.match(await page.locator('#errorMessage').innerText(),/BILI_PAGE_PERMISSION/);
 assert.equal(await page.locator('#studyToolbar').isVisible(),false);
 await page.evaluate(async()=>{
   __api.fetchFailure={success:false,error:'BILI_SERVICE_PERMISSION',message:'需要允许 B 站字幕服务'};
   chrome.permissions.request=async ({origins})=>{__api.permissionOrigins=origins;__api.fetchFailure=null;return true;};
   await startDigest(currentVideoId,currentVideoUrl);
 });
 await page.getByRole('button',{name:'允许 B 站字幕服务',exact:true}).click();
 await page.locator('#transcriptList .transcript-entry').first().waitFor();
 assert.deepEqual(await page.evaluate(()=>__api.permissionOrigins),require('../platforms.js').BILI_SERVICE_ORIGINS);
 assert.equal(await page.locator('#errorState').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: raw-first / cleanup disabled / explicit AI / search / cache / long overview / partial retry / track / export / stop / narrow layout');
 // Short platform cues must read as paragraphs without losing their identity.
 const reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));
 await reader.goto('http://digest.test/sidepanel.html');
 await reader.locator('.transcript-entry').first().waitFor();
 assert.equal(await reader.locator('[data-reading-layout=sentence]').getAttribute('aria-pressed'),'true');
 await reader.getByRole('button',{name:'段落',exact:true}).click();
 const original=await reader.evaluate(()=>{
   const send=chrome.tabs.sendMessage;
   chrome.tabs.sendMessage=(tabId,message,...args)=>{if(message.action==='seekTo')__api.calls.push({payload:message});return send(tabId,message,...args);};
   const texts=['阅读时保留原始','字幕可以帮助我们核对事实。',
     ...Array.from({length:10},()=>['很多时候问题并不是看得太少，','而是看完以后，','没有把信息整理成自己的理解。','阅读时可以先看完整的段落，','遇到重要的内容再回到视频核对。']).flat()];
   currentTranscript=texts.map((text,i)=>({text,start:i*1.2,duration:1.1}));
   currentTranscriptText=texts.join(' ');currentVideoTitle='字幕阅读示例 · 模拟数据';
   document.getElementById('videoTitle').textContent=currentVideoTitle;
   studyState.key='';__api.time=2.5;stopPlaybackTracking();renderTranscript();autoScrollEnabled=false;
   return texts;
 });
 await reader.waitForFunction(()=>document.querySelector('.active-playback')?.dataset.segmentId==='s2');
 assert.equal(await reader.locator('[data-reading-layout=paragraph]').getAttribute('aria-pressed'),'true');
 assert.ok(await reader.locator('.reading-paragraph').count()<original.length/3);
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),original);
 assert.equal(await reader.locator('.paragraph-time').count(),await reader.locator('.reading-paragraph').count());
 assert.equal(await reader.locator('.transcript-entry .transcript-time:visible').count(),0);
 await reader.locator('[data-segment-id=s4] .transcript-text').click();
 assert.equal(await reader.evaluate(()=>__api.calls.filter(m=>m.payload?.action==='seekTo').at(-1)?.payload.seconds),4.8);
 const seeks=await reader.evaluate(()=>__api.calls.filter(m=>m.payload?.action==='seekTo').length);
 await reader.evaluate(()=>{
   const a=document.querySelector('[data-segment-id=s0] .transcript-text').firstChild;
   const b=document.querySelector('[data-segment-id=s1] .transcript-text').firstChild;
   const range=document.createRange();range.setStart(a,0);range.setEnd(b,b.length);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   document.querySelector('[data-segment-id=s1]').click();
 });
 assert.equal(await reader.evaluate(()=>__api.calls.filter(m=>m.payload?.action==='seekTo').length),seeks);
 await reader.evaluate(()=>window.getSelection().removeAllRanges());
 await reader.fill('#transcriptSearchInput','原始字幕');
 assert.equal(await reader.locator('#transcriptSearchCount').innerText(),'1 of 1');
 assert.equal(await reader.locator('mark.current').count(),2);
 await reader.fill('#transcriptSearchInput','');
 await reader.evaluate(()=>{autoScrollEnabled=false;document.getElementById('contentArea').scrollTop=650;});
 const stickyGap=await reader.evaluate(()=>document.querySelector('.transcript-layout-controls').getBoundingClientRect().top-document.getElementById('contentArea').getBoundingClientRect().top);
 assert.ok(Math.abs(stickyGap)<1,`sticky toolbar must cover the content padding: ${stickyGap}px`);
 const anchor=await reader.evaluate(()=>{
   const top=document.querySelector('.transcript-layout-controls').getBoundingClientRect().bottom;
   const row=[...document.querySelectorAll('.transcript-entry')].find(r=>r.getBoundingClientRect().bottom>top+1);
   return {id:row.dataset.segmentId,top:row.getBoundingClientRect().top};
 });
 await reader.getByRole('button',{name:'跟读',exact:true}).click();
 assert.equal(await reader.locator('.reading-paragraph').count(),0);
 assert.equal(await reader.locator('.transcript-entry .transcript-time:visible').count(),0);
 assert.equal(await reader.locator('.reading-time-marker').count(),4);
 assert.equal(await reader.locator('.transcript-text').first().evaluate(el=>getComputedStyle(el).fontSize),'16px');
 assert.equal(await reader.locator('.transcript-entry').first().evaluate(el=>getComputedStyle(el).borderLeftWidth),'2px');
 assert.ok(Math.abs(await reader.locator(`[data-segment-id=${anchor.id}]`).evaluate(el=>el.getBoundingClientRect().top)-anchor.top)<4);
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),original);
 await reader.locator('.reading-time-marker').nth(1).click();
 assert.equal(await reader.evaluate(()=>__api.calls.filter(m=>m.payload?.action==='seekTo').at(-1)?.payload.seconds),15.6);
 await reader.locator('[data-segment-id=s4]').press('Enter');
 assert.equal(await reader.evaluate(()=>__api.calls.filter(m=>m.payload?.action==='seekTo').at(-1)?.payload.seconds),4.8);
 await reader.evaluate(async()=>{await saveCurrentTranscriptViewState();__api.savedView=await loadTranscriptViewState(currentVideoId);});
 assert.equal(await reader.evaluate(()=>__api.savedView.layout),'sentence');
 await reader.getByRole('button',{name:'段落',exact:true}).click();
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),original);
 assert.equal(await reader.evaluate(()=>__api.paid),0);
 assert.equal(await reader.evaluate(()=>autoScrollEnabled),false);
 await reader.evaluate(()=>{__api.time=6.1;document.getElementById('contentArea').scrollTop=0;});
 await reader.waitForFunction(()=>document.querySelector('.active-playback')?.dataset.segmentId==='s5');
 assert.equal(await reader.locator('.active-playback').count(),1);
 assert.equal(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await reader.screenshot({animations:'disabled',path:path.join(root,'dist',`reader-ui-v${version}-360.png`)});
 await reader.setViewportSize({width:440,height:880});
 assert.equal(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await reader.screenshot({animations:'disabled',path:path.join(root,'dist',`reader-ui-v${version}-440.png`)});
 assert.deepEqual(errors,[]);
 console.log('PASS: paragraph grouping / exact source text / sentence highlight and seek / selection / cross-cue search / anchored layout switch / zero AI / narrow layout');
 // A visual micro-gap must not add characters to selection/search/export.
 const spacedTexts=await reader.evaluate(()=>{
   const nativePlan=STUDY.readingPlan;__api.planCalls=0;
   STUDY.readingPlan=segments=>{__api.planCalls++;return nativePlan(segments);};
   const texts=['很多时候问题并不是看得太少','而是看完以后没有把信息整理成自己的理解。',
     '我们收藏了很多视频也记下了很多观点','但过了一段时间真正能用起来的内容并不多',
     '阅读时可以先看完整的段落','遇到重要的内容再回到视频核对。',
     '这样既能保留说话者原来的表达','也能避免一句一句往下翻','把注意力更多地放在内容本身'];
   currentTranscript=texts.map((text,i)=>({text,start:i*4.6,duration:4}));
   currentTranscriptText=texts.join('');studyState.key='';__api.time=0;
   renderTranscript();autoScrollEnabled=false;document.getElementById('contentArea').scrollTop=0;
   __api.savedPlan=transcriptReadingPlan;
   return texts;
 });
 assert.ok(await reader.locator('.reading-gap').count()>=2);
 assert.equal(await reader.locator('.reading-gap').first().evaluate(el=>getComputedStyle(el).marginInlineEnd),'3px');
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),spacedTexts);
 assert.doesNotMatch(await reader.locator('#transcriptList').textContent(),/，/);
 await reader.fill('#transcriptSearchInput','太少而是');
 assert.equal(await reader.locator('#transcriptSearchCount').innerText(),'1 of 1');
 assert.equal(await reader.locator('mark.current').count(),2);
 await reader.fill('#transcriptSearchInput','');
 const selectionText=await reader.evaluate(()=>{
   const first=document.querySelector('[data-segment-id=s0] .transcript-text');
   const last=document.querySelector('[data-segment-id=s1] .transcript-text');
   const range=document.createRange();range.setStart(first,0);range.setEnd(last,last.childNodes.length);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
   return selection.toString();
 });
 assert.equal(selectionText,spacedTexts[0]+spacedTexts[1]);
 await reader.locator('.selection-note-btn').click();
 await reader.waitForFunction(()=>__api.notes.length===1);
 assert.equal(await reader.evaluate(()=>__api.notes[0].text),selectionText);
 await reader.evaluate(()=>{
   window.getSelection().removeAllRanges();
   // Capture output without changing the user's OS clipboard or creating files.
   copyToClipboardWithFeedback=text=>{__api.copied=text;};
   downloadTextFile=(text,filename)=>{__api.exported={text,filename};};
 });
 await reader.click('#copyTranscriptBtn');await reader.click('#exportTranscriptBtn');
 const outputs=await reader.evaluate(()=>[__api.copied,__api.exported.text]);
 for(const text of outputs) {assert.doesNotMatch(text,/，/);for(const source of spacedTexts) assert.ok(text.includes(source));}
 await reader.getByRole('button',{name:'跟读',exact:true}).click();
 assert.equal(await reader.locator('.reading-gap').count(),0);
 await reader.getByRole('button',{name:'段落',exact:true}).click();
 assert.ok(await reader.locator('.reading-gap').count()>=2);
 await reader.evaluate(()=>{__api.time=4.8;document.getElementById('contentArea').scrollTop=0;});
 await reader.waitForFunction(()=>document.querySelector('.active-playback')?.dataset.segmentId==='s1');
 assert.equal(await reader.evaluate(()=>__api.planCalls),1);
 assert.equal(await reader.evaluate(()=>transcriptReadingPlan===__api.savedPlan),true);
 assert.equal(await reader.evaluate(()=>__api.paid),0);
 for (const width of [360,440]) {
   await reader.setViewportSize({width,height:880});
   assert.equal(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await reader.screenshot({animations:'disabled',path:path.join(root,'dist',`spaced-reading-v${version}-${width}.png`)});
 }
 await reader.selectOption('#subtitleTrack','en');await reader.waitForFunction(()=>currentTranscriptLanguage==='en');
 assert.equal(await reader.locator('.reading-gap').count(),0);
 assert.equal(await reader.evaluate(()=>transcriptReadingPlan===__api.savedPlan),false);
 assert.equal(await reader.evaluate(()=>__api.planCalls),2);
 console.log('PASS: visual-only micro-gaps / raw selection and excerpts / copy and export / cross-gap search / cached layout / source invalidation / no AI');
 // Refresh is a provider request, not a cache reopen, and failure is atomic.
 const refreshing=await context.newPage();refreshing.on('pageerror',e=>errors.push(e.message));
 await refreshing.goto('http://digest.test/sidepanel.html');await refreshing.locator('.transcript-entry').first().waitFor();
 await refreshing.evaluate(async()=>{currentAnalysis={chapters:[],summaries:[],keyQuotes:[],sentinel:'keep'};__api.notes=[{id:'saved',text:'保留摘录'}];await saveToCache(currentVideoId);});
 const countFetch=()=>refreshing.evaluate(()=>__api.calls.filter(m=>m.action==='fetchTranscript').length);
 const refresh=async()=>{await refreshing.getByRole('button',{name:'刷新字幕',exact:true}).click();await refreshing.waitForFunction(()=>!subtitleReloadRequest);};
 let count=await countFetch();await refresh();assert.equal(await countFetch(),count+1);
 assert.equal(await refreshing.evaluate(()=>currentAnalysis.sentinel),'keep');
 assert.equal(await refreshing.evaluate(()=>__api.calls.filter(m=>m.action==='fetchTranscript').at(-1).forceRefresh),true);
 assert.equal(await refreshing.evaluate(()=>__api.calls.filter(m=>m.action==='fetchTranscript').at(-1).trackId),'zh');
 await refreshing.evaluate(()=>{__api.count=17;});await refresh();
 assert.equal(await refreshing.locator('.transcript-entry').count(),17);
 assert.equal(await refreshing.evaluate(()=>currentAnalysis),null);
 assert.equal(await refreshing.evaluate(async()=> (await chrome.storage.local.get(`digest_${currentVideoId}`))[`digest_${currentVideoId}`].transcript.length),17);
 for(const failure of ['network','wrong-video','empty']) {
   await refreshing.evaluate(failure=>{__api.fetchFailure=failure==='network'?{success:false,message:'模拟网络失败'}:null;__api.fetchResult=failure==='wrong-video'?{...__api.lastFetchResult,success:true,source:{...currentTranscriptSource,videoId:'bili:BV11eHF6vE86:p1'}}:failure==='empty'?{success:true,source:currentTranscriptSource,transcript:[]}:null;},failure);
   await refresh();assert.equal(await refreshing.locator('.transcript-entry').count(),17);
   assert.match(await refreshing.locator('#studyStatus').innerText(),/已保留当前字幕/);
   assert.equal(await refreshing.evaluate(async()=> (await chrome.storage.local.get(`digest_${currentVideoId}`))[`digest_${currentVideoId}`].transcript.length),17);
 }
 await refreshing.evaluate(()=>{__api.fetchFailure=null;__api.fetchResult=null;__api.fetchDelay=150;});
 count=await countFetch();await refreshing.getByRole('button',{name:'刷新字幕',exact:true}).click();
 assert.equal(await refreshing.locator('#refreshTranscriptBtn').isDisabled(),true);
 assert.equal(await refreshing.locator('.transcript-entry').count(),17);
 await refreshing.evaluate(()=>refreshStudyTranscript());await refreshing.waitForFunction(()=>!subtitleReloadRequest);
 assert.equal(await countFetch(),count+1);
 await refreshing.evaluate(async()=>{
   const timer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,ms===30000?5:ms,...args);
   try {await refreshStudyTranscript();} finally {window.setTimeout=timer;}
 });
 assert.match(await refreshing.locator('#studyStatus').innerText(),/超时/);
 await refreshing.waitForTimeout(170);assert.equal(await refreshing.locator('.transcript-entry').count(),17);
 assert.equal(await refreshing.locator('#refreshTranscriptBtn').isDisabled(),false);
 assert.equal(await refreshing.evaluate(()=>__api.notes[0].text),'保留摘录');
 assert.equal(await refreshing.evaluate(()=>__api.paid),0);
 await refreshing.evaluate(async()=>{
   const pending=refreshStudyTranscript();currentVideoId='bili:BV11eHF6vE86:p1';digestGeneration++;
   currentTranscript=[{text:'新视频的字幕',start:0,duration:1}];studyStatus('新视频状态');await pending;
 });
 assert.equal(await refreshing.evaluate(()=>currentTranscript[0].text),'新视频的字幕');
 assert.equal(await refreshing.locator('#studyStatus').innerText(),'新视频状态');
 console.log('PASS: refresh bypasses cache / preserves selected track and unchanged overview / invalidates stale overview / errors retain old captions / double-click / timeout / stale response / notes / zero AI');
 const dense=await context.newPage();dense.on('pageerror',e=>errors.push(e.message));
 await dense.goto('http://digest.test/sidepanel.html');await dense.locator('.transcript-entry').first().waitFor();
 const fixture=process.env.READING_FIXTURE?JSON.parse(fs.readFileSync(process.env.READING_FIXTURE,'utf8')):null;
 const denseInfo=await dense.evaluate(fixture=>{
   currentTranscript=fixture?.transcript||Array.from({length:610},(_,i)=>({text:'这是平台提供的连续字幕内容',start:i*2,duration:2}));
   currentTranscriptLanguage=fixture?.language||'ai-zh';currentTranscriptText=currentTranscript.map(r=>r.text).join('');
   currentVideoTitle=fixture?.info?.title||'连续字幕阅读 · 模拟数据';document.getElementById('videoTitle').textContent=currentVideoTitle;
   if(fixture) {
     currentTranscriptTracks=fixture.tracks;currentTranscriptSource={...currentTranscriptSource,trackId:fixture.source.trackId};
     document.getElementById('videoChannel').textContent=fixture.info.channelName+' · 实际字幕预览';
   }
   studyState.key='';transcriptReadingLayout='paragraph';renderTranscript();autoScrollEnabled=false;document.getElementById('contentArea').scrollTop=0;
   const index=[...transcriptReadingPlan.spaceBefore][0];
   const first=document.querySelector(`[data-segment-id=s${index-1}] .transcript-text`),last=document.querySelector(`[data-segment-id=s${index}] .transcript-text`);
   const range=document.createRange();range.setStart(first,0);range.setEnd(last,last.childNodes.length);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   const result={rows:currentTranscript.length,gaps:transcriptReadingPlan.spaceBefore.size,selected:selection.toString(),source:currentTranscript[index-1].text+currentTranscript[index].text};
   selection.removeAllRanges();return result;
 },fixture);
 assert.ok(denseInfo.gaps>100);assert.equal(denseInfo.selected,denseInfo.source);
 assert.equal(await dense.locator('.transcript-entry').count(),denseInfo.rows);
 assert.equal(await dense.locator('.reading-gap').first().evaluate(el=>getComputedStyle(el).marginInlineEnd),'3px');
 assert.equal(await dense.locator('.reading-pause, .reading-break').count(),0);
 // At least one separated pair stays on the same line: gaps must not force
 // newline or block layout, and the actual glyph spacing is three pixels.
 const inlineGaps=await dense.evaluate(()=>[...document.querySelectorAll('.reading-gap')].map(gap=>{
   const left=gap.previousElementSibling?.querySelector('.transcript-text');
   const right=gap.nextElementSibling?.querySelector('.transcript-text');
   if(!left||!right)return null;
   const leftRect=Array.from(left.getClientRects()).at(-1),rightRect=right.getClientRects()[0];
   return Math.abs(leftRect.top-rightRect.top)<1?rightRect.left-leftRect.right:null;
 }).filter(value=>value!==null));
 assert.ok(inlineGaps.length>20);
 assert.ok(inlineGaps.every(gap=>Math.abs(gap-3)<0.5),JSON.stringify(inlineGaps.slice(0,5)));
 for(const width of [360,580]) {
   await dense.setViewportSize({width,height:880});
   await dense.locator('#contentArea').evaluate(el=>el.scrollTop=0);
   await dense.screenshot({animations:'disabled',path:path.join(root,'dist',`dense-reading-v${version}-${width}.png`)});
   const gap=await dense.evaluate(()=>{const area=document.getElementById('contentArea');area.scrollTop=650;return document.querySelector('.transcript-layout-controls').getBoundingClientRect().top-area.getBoundingClientRect().top;});
   assert.ok(Math.abs(gap)<1,`No clipped text above toolbar at ${width}px: ${gap}`);
   await dense.screenshot({animations:'disabled',path:path.join(root,'dist',`dense-scrolled-v${version}-${width}.png`)});
 }
 console.log(`PASS: gapless reading / visual gaps preserve selected source / sticky padding coverage at 360px and 580px (${denseInfo.rows} captions, ${denseInfo.gaps} micro-gaps${fixture?', public Bilibili fixture':''})`);
 await dense.getByRole('button',{name:'跟读',exact:true}).click();
 assert.equal(await dense.locator('.reading-paragraph, .reading-gap').count(),0);
 assert.equal(await dense.locator('.transcript-entry').count(),denseInfo.rows);
 assert.ok(await dense.locator('.reading-time-marker').count()<denseInfo.rows/3);
 for(const width of [360,580]) {
   await dense.setViewportSize({width,height:880});
   await dense.locator('#contentArea').evaluate(el=>el.scrollTop=0);
   assert.equal(await dense.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await dense.screenshot({animations:'disabled',path:path.join(root,'dist',`follow-reading-v${version}-${width}.png`)});
 }
 assert.equal(await dense.evaluate(()=>__api.paid),0);
 console.log('PASS: follow reading / 16px source cues / sparse time markers / keyboard seek / saved layout / zero AI');
 if (process.env.READING_BASELINE) {
   // Do not benchmark while unrelated fixture panels are polling playback.
   await page.close();await refreshing.close();await dense.close();
   const source=fs.readFileSync(process.env.READING_BASELINE,'utf8');
   await reader.addScriptTag({content:`window.__readingBaseline=(()=>{${source}\nreturn STUDY;})();`});
   const timing=await reader.evaluate(()=>{
     const texts=['很多时候问题并不是看得太少','而是看完以后没有把信息整理成自己的理解。',
       '我们收藏了很多视频也记下了很多观点','但过了一段时间真正能用起来的内容并不多'];
     const currentPlan=STUDY.readingPlan;
     const stats=values=>{values.sort((a,b)=>a-b);return {medianMs:+values[Math.floor(values.length/2)].toFixed(2),p95Ms:+values[Math.floor(values.length*.95)].toFixed(2)};};
     const report=[];
     for (const count of [1310,3000,10000]) {
       const raw=Array.from({length:count},(_,i)=>({text:texts[i%texts.length],start:i*2.6,duration:2}));
       const rows=STUDY.captions(raw),before=[],after=[];
       for (let i=0;i<30;i++) {
         let start=performance.now();__readingBaseline.readingParagraphs(rows);let ms=performance.now()-start;if(i>=5)before.push(ms);
         start=performance.now();currentPlan(rows);ms=performance.now()-start;if(i>=5)after.push(ms);
       }
       const result={count,baselinePlan:stats(before),newPlan:stats(after)};
       if (count===1310) {
         const oldRender=[],newRender=[];
         // Same DOM renderer and source data; compare old grouping against the
         // new plan, including the extra paragraph and comma nodes + layout.
         for(let i=0;i<8;i++) {
           for(const newer of (i%2?[true,false]:[false,true])) {
             STUDY.readingPlan=newer?currentPlan:s=>({groups:__readingBaseline.readingParagraphs(s),spaceBefore:new Set()});
             currentTranscript=raw;currentTranscriptMode='original';stopPlaybackTracking();
             const start=performance.now();renderTranscript();void document.getElementById('transcriptList').offsetHeight;
             const ms=performance.now()-start;stopPlaybackTracking();if(i>=2)(newer?newRender:oldRender).push(ms);
           }
         }
         result.baselineRender=stats(oldRender);result.newRender=stats(newRender);
       }
       report.push(result);
     }
     STUDY.readingPlan=currentPlan;
     return report;
   });
   console.log('PERF (isolated Edge, synthetic captions): '+JSON.stringify(timing));
 }
 assert.deepEqual(errors,[]);
 // Toolbar entry is also tested after delayed mounting, SPA changes and replacement.
 const floating=await context.newPage();await floating.goto('http://digest.test/sidepanel.html');
 await floating.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<h1>测试视频</h1><video></video><style>*{margin:0;padding:0}.video-toolbar-container{display:flex;align-items:center;justify-content:space-between;width:668px}.video-toolbar-left{display:flex;width:400px;flex-shrink:0;justify-content:space-around}.video-toolbar-right{width:148px}</style><div class="video-toolbar-container"></div>'}));
 await floating.goto('https://www.bilibili.com/video/BV1a6Yx62EH4/');
 await floating.addScriptTag({path:path.join(root,'platforms.js')});await floating.addScriptTag({path:path.join(root,'bilibili-content.js')});
 assert.equal(await floating.locator('#bili-digest-controls').count(),0);
 await floating.locator('.video-toolbar-container').evaluate(el=>{el.innerHTML='<div class="video-toolbar-left"><span>点赞</span><span>投币</span><span>收藏</span><span>转发</span></div><div class="video-toolbar-right">笔记 · 更多</div>';});
 await floating.getByRole('button',{name:'digest',exact:true}).click();
 assert.ok(await floating.evaluate(()=>__api.calls.some(m=>m.action==='openSidePanel')));
 assert.ok(await floating.evaluate(()=>{
   const host=document.getElementById('bili-digest-controls'), left=document.querySelector('.video-toolbar-left'), right=document.querySelector('.video-toolbar-right');
   return left.nextElementSibling===host && host.parentElement===left.parentElement && getComputedStyle(host).position==='relative' && Math.abs(host.getBoundingClientRect().left-left.getBoundingClientRect().right-12)<1 && host.getBoundingClientRect().right<=right.getBoundingClientRect().left && right.getBoundingClientRect().right<=right.parentElement.getBoundingClientRect().right+1;
 }));
 await floating.mouse.move(0,0);
 assert.equal(await floating.getByRole('button',{name:'digest',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 135, 189)');
 await floating.getByRole('button',{name:'digest',exact:true}).focus();
 await floating.keyboard.press('Tab');
 assert.equal(await floating.getByRole('button',{name:'保存摘录',exact:true}).evaluate(el=>el.matches(':focus-visible')),true);
 await floating.evaluate(()=>{history.pushState({},'', '?p=2');document.getElementById('bili-digest-controls').remove();});
 await floating.getByRole('button',{name:'digest',exact:true}).waitFor();assert.equal(await floating.locator('#bili-digest-controls').count(),1);
 await floating.locator('.video-toolbar-container').evaluate(el=>{const next=el.cloneNode(true);next.querySelector('#bili-digest-controls').remove();el.replaceWith(next);});
 await floating.getByRole('button',{name:'digest',exact:true}).waitFor();
 assert.equal(await floating.locator('.video-toolbar-left + #bili-digest-controls').count(),1);
 assert.equal(await floating.locator('#bili-digest-controls').count(),1);
 console.log('PASS: toolbar entry / delayed mounting / narrow action bar / keyboard focus / click relay / SPA replacement / single instance');
 await context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
