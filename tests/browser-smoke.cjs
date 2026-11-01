// Real DOM/rendering with deterministic captions and AI responses. No external requests.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root=path.resolve(__dirname,'..');
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
 await context.addInitScript(()=>{
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
     if(m.action==='fetchTranscript') {if(api.fetchFailure)return api.fetchFailure;api.track=m.trackId||'zh';const transcript=rows();return {success:true,transcript,transcriptText:transcript.map(r=>r.text).join('\n'),transcriptTextTimestamped:'fixture',language:api.track,source:{version:2,videoId,part:1,cid:'123',bvid:'BV1a6Yx62EH4',endpoint:'wbi/v2',trackId:api.track},tracks:[{id:'zh',name:'中文',ai:true},{id:'en',name:'English',ai:false}]};}
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
   window.chrome={storage:{local,session:local},runtime:{sendMessage,onMessage:event,getURL:s=>'http://digest.test/'+s},windows:{getCurrent:async()=>({id:1})},tabs:{query:async()=>[{id:1,url:'https://www.bilibili.com/video/BV1a6Yx62EH4/',active:true,windowId:1}],get:async()=>({id:1,url:'https://www.bilibili.com/video/BV1a6Yx62EH4/'}),onUpdated:event,onActivated:event,sendMessage:async(_id,m)=>{if(api.connectionError)throw Error('Receiving end does not exist.');return m.action==='getCurrentTime'?{success:true,currentTime:api.time,paused:true}:{success:true};},create:async()=>({})},permissions:{request:async()=>{api.permissionGranted=true;return true;},contains:async()=>!api.connectionError||!!api.permissionGranted}};
 });
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
 await page.click('#cleanTranscriptBtn');await page.waitForFunction(()=>!studyState.busy&&studyState.cleaned.length>0);
 assert.equal(await page.locator('#cleanModeBtn').getAttribute('class'),'enhance-btn active');
 const paid=await page.evaluate(()=>__api.paid);await page.click('#rawModeBtn');assert.equal(await page.locator('#transcriptList .transcript-entry').count(),14);
 await page.click('#cleanTranscriptBtn');await page.waitForFunction(()=>!studyState.busy);assert.equal(await page.evaluate(()=>__api.paid),paid);
 await page.click('#rawModeBtn');
 await page.screenshot({path:path.join(root,'dist','reader-preview.png')});
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
 await page.click('#quotesList button:last-child');await page.waitForFunction(()=>__api.notes.length>0);
 // Track switching clears stale overview and preserves the raw-first rule.
 await page.selectOption('#subtitleTrack','en');await page.waitForFunction(()=>currentTranscriptLanguage==='en');
 assert.equal(await page.evaluate(()=>currentAnalysis),null);
 assert.equal(await page.evaluate(()=>currentTranscriptMode),'original');
 await page.click('[data-tab=transcript]');
 await page.click('[data-transcript-mode=bilingual]');await page.waitForFunction(()=>transcriptParagraphCache.size>0);
 await page.click('[data-tab=notes]');await page.locator('#notesList .note-text').first().waitFor();
 assert.doesNotMatch(await page.locator('#notesList').innerText(),/Translating|Waiting for translation/);
 await page.click('[data-tab=transcript]');
 let confirmation=false;page.once('dialog',async d=>{confirmation=true;await d.dismiss();});await page.click('#exportTranscriptBtn');assert.equal(confirmation,true);
 await page.click('[data-transcript-mode=original]');
 // Stop allows the in-flight batch to settle but sends no subsequent batches.
 await page.evaluate(()=>{__api.cache={};__api.delay=150;});
 await page.click('#cleanTranscriptBtn');await page.click('#stopStudyBtn');await page.waitForFunction(()=>!studyState.busy);
 assert.match(await page.locator('#studyStatus').innerText(),/已停止/);
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
 console.log('PASS: raw-first / explicit AI / search / cleanup toggle / cache / long overview / partial retry / track / export / stop / narrow layout');
 // Short platform cues must read as paragraphs without losing their identity.
 const reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));
 await reader.goto('http://digest.test/sidepanel.html');
 await reader.locator('.transcript-entry').first().waitFor();
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
 const anchor=await reader.evaluate(()=>{
   const top=document.querySelector('.transcript-layout-controls').getBoundingClientRect().bottom;
   const row=[...document.querySelectorAll('.transcript-entry')].find(r=>r.getBoundingClientRect().bottom>top+1);
   return {id:row.dataset.segmentId,top:row.getBoundingClientRect().top};
 });
 await reader.getByRole('button',{name:'逐句',exact:true}).click();
 assert.equal(await reader.locator('.reading-paragraph').count(),0);
 assert.equal(await reader.locator('.transcript-entry .transcript-time:visible').count(),original.length);
 assert.ok(Math.abs(await reader.locator(`[data-segment-id=${anchor.id}]`).evaluate(el=>el.getBoundingClientRect().top)-anchor.top)<4);
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),original);
 await reader.getByRole('button',{name:'段落',exact:true}).click();
 assert.deepEqual(await reader.locator('.transcript-text').allTextContents(),original);
 assert.equal(await reader.evaluate(()=>__api.paid),0);
 assert.equal(await reader.evaluate(()=>autoScrollEnabled),false);
 await reader.evaluate(()=>{__api.time=6.1;document.getElementById('contentArea').scrollTop=0;});
 await reader.waitForFunction(()=>document.querySelector('.active-playback')?.dataset.segmentId==='s5');
 assert.equal(await reader.locator('.active-playback').count(),1);
 assert.equal(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await reader.screenshot({path:path.join(root,'dist','paragraph-reading-v015.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS: paragraph grouping / exact source text / sentence highlight and seek / selection / cross-cue search / anchored layout switch / zero AI / narrow layout');
 // Floating entry is also tested in a browser DOM after SPA changes and removal.
 const floating=await context.newPage();await floating.goto('http://digest.test/sidepanel.html');
 await floating.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>测试视频</h1><video></video>'}));
 await floating.goto('https://www.bilibili.com/video/BV1a6Yx62EH4/');
 await floating.addScriptTag({path:path.join(root,'platforms.js')});await floating.addScriptTag({path:path.join(root,'bilibili-content.js')});
 await floating.getByRole('button',{name:'Digest · 字幕'}).click();
 assert.ok(await floating.evaluate(()=>__api.calls.some(m=>m.action==='openSidePanel')));
 await floating.evaluate(()=>{history.pushState({},'', '?p=2');document.getElementById('bili-digest-controls').remove();});
 await floating.getByRole('button',{name:'Digest · 字幕'}).waitFor();assert.equal(await floating.locator('#bili-digest-controls').count(),1);
 console.log('PASS: floating entry / click relay / SPA recovery / single instance');
 await context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
