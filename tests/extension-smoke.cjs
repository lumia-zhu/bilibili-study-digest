// Loads the actual unpacked extension in an isolated Chromium profile.
// Bilibili HTTP responses are fixtures; Chrome APIs and the worker are real.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {fixture}=require('./bili-fixture.cjs');
(async()=>{
 const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try {
  context.setDefaultTimeout(15000);
  console.log('Chromium launched');
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
  console.log('Extension worker ready');
  const id=worker.url().split('/')[2], bvid='BV1a6Yx62EH4';
  const headers={'access-control-allow-origin':'https://www.bilibili.com','access-control-allow-credentials':'true'};
  await context.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><h1 class="video-title">真实扩展加载测试</h1><video id="unrelated-preview"></video><div class="bpx-player-video-wrap"><bwp-video></bwp-video></div><span class="bpx-player-ctrl-time-current">00:38</span>'}));
  // Silent 12-second WAV: real native media clock, generated entirely locally.
  const wav=Buffer.alloc(44+8000*12,128);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  await context.route('https://www.bilibili.com/fixture.wav',r=>r.fulfill({contentType:'audio/wav',body:wav}));
  const http=fixture({part:1});
  await context.route('https://api.bilibili.com/**',async r=>r.fulfill({headers,contentType:'application/json',body:JSON.stringify(await (await http.fetchImpl(r.request().url())).json())}));
  await context.route('https://aisubtitle.hdslb.com/**',r=>r.fulfill({headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({body:[{from:0.25,to:3,content:'第一句字幕。'},{from:6.4,to:10,content:'第二句字幕。'},{from:37,to:41,content:'第三句字幕。'}]})}));
  const video=await context.newPage();await video.goto(`https://www.bilibili.com/video/${bvid}/`,{waitUntil:'domcontentloaded'});
  console.log('Fixture page ready');
  await video.getByRole('button',{name:'Digest · 字幕'}).waitFor();
  await video.getByRole('button',{name:'Digest · 字幕'}).click();
  const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'https://www.bilibili.com/*'}))[0].id);
  await video.evaluate(()=>{document.querySelector('bwp-video').currentTime=38.25;});
  const isolatedTime=await worker.evaluate(async tabId=>(await chrome.scripting.executeScript({target:{tabId},func:()=>typeof document.querySelector('bwp-video').currentTime}))[0].result,tabId);
  assert.equal(isolatedTime,'undefined');
  // Recreate the user's exact error using real Chrome APIs, then recover.
  await worker.evaluate(async tabId=>chrome.scripting.executeScript({target:{tabId},func:()=>globalThis.__digestBiliController.dispose()}),tabId);
  const missing=await worker.evaluate(async tabId=>{
    try {await chrome.tabs.sendMessage(tabId,{action:'getVideoInfo'});return '';}
    catch(e){return e.message;}
  },tabId);
  assert.match(missing,/Receiving end does not exist/);
  const recovered=await worker.evaluate(async ({tabId,bvid})=>sendToVideoContent(tabId,{action:'getVideoInfo'},`bili:${bvid}:p1`),{tabId,bvid});
  assert.equal(recovered.title,'真实扩展加载测试');
  assert.equal(await video.locator('#bili-digest-controls').count(),1);
  console.log('PASS: reproduced missing receiver, automatically restored receiver and one floating control');
  // The reported Blocked failure cannot affect subtitle or metadata retrieval.
  await worker.evaluate(()=>{chrome.scripting.executeScript=async()=>{throw Error('Blocked');};});
  const result=await worker.evaluate(async ({tabId,bvid})=>handleFetchTranscript(`bili:${bvid}:p1`,tabId),{tabId,bvid});
  console.log('Subtitle response received');
  assert.equal(result.success,true);assert.equal(result.transcript.length,3);assert.equal(result.source.cid,'456');
  assert.equal(result.source.transport,'background');
  const options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);
  const metadata=await options.evaluate(({tabId,bvid})=>chrome.runtime.sendMessage({action:'relayToContent',tabId,videoId:`bili:${bvid}:p1`,payload:{action:'getVideoInfo'}}),{tabId,bvid});
  assert.equal(metadata.success,true);assert.equal(metadata.response.title,'课程');
  console.log('PASS: subtitle and metadata read with executeScript forced to throw Blocked');
  const response=await options.evaluate(()=>chrome.runtime.sendMessage({action:'testAiConnection'}));
  assert.equal(response.success,false);assert.match(response.error,/key|密钥/i);
  // An extension options tab must receive the error, not lose its message channel.
  const rejected=await options.evaluate(()=>chrome.runtime.sendMessage({action:'studyAiBatch'}));
  assert.equal(rejected.success,false);assert.match(rejected.error,/侧栏/);
  await options.locator('.advanced-settings summary').click();
  await options.locator('#aiBaseUrl').fill('https://api.deepseek.com');
  await options.locator('#aiModel').fill('fixture-model');
  await options.locator('button[type=submit]').click();
  await options.waitForFunction(async()=> (await chrome.storage.local.get('ytd_settings')).ytd_settings?.aiModel==='fixture-model');
  const stored=await worker.evaluate(async()=> (await chrome.storage.local.get('ytd_settings')).ytd_settings);
  assert.equal(stored.schemaVersion,2);assert.equal(stored.aiModel,'fixture-model');
  const notes=await worker.evaluate(async ({bvid})=>Promise.all([handleSaveNote(`bili:${bvid}:p1`,1,'课程','作者','第一条原文'),handleSaveNote(`bili:${bvid}:p1`,2,'课程','作者','第二条原文')]),{bvid});
  assert.ok(notes.every(n=>n.success));
  assert.equal(await worker.evaluate(async()=> (await chrome.storage.local.get('ytd_notes')).ytd_notes.length),2);
  // Render the real sidepanel document while its bound video tab stays active.
  await video.bringToFront();
  const panelReady=context.waitForEvent('page');
  await worker.evaluate(url=>chrome.tabs.create({url,active:false}),`chrome-extension://${id}/sidepanel.html`);
  const panel=await panelReady;await panel.waitForURL(`chrome-extension://${id}/sidepanel.html`);await panel.waitForLoadState('domcontentloaded');
  await panel.evaluate(()=>checkCurrentTab());
  await panel.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='37');
  assert.match(await panel.locator('#playbackStatus').innerText(),/0:38/);
  await video.locator('.bpx-player-ctrl-time-current').evaluate(el=>el.textContent='00:07');
  await panel.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='6.4');
  console.log('PASS: custom player clock updates highlight');
  await video.locator('.bpx-player-ctrl-time-current').evaluate(el=>el.textContent='00:00');
  await panel.waitForFunction(()=>!document.querySelector('.transcript-entry.active-playback'));
  // Replace the custom player with a loaded native video. Playback advances
  // automatically and pause/seek changes are picked up without calling tick.
  await video.evaluate(async()=>{
    const container=document.querySelector('.bpx-player-video-wrap');container.replaceChildren();
    const player=document.createElement('video');player.muted=true;
    // Blob URLs provide a seekable resource without implementing HTTP Range
    // serving in the fixture router (a plain HTTP 200 WAV is not seekable).
    player.src=URL.createObjectURL(await (await fetch('/fixture.wav')).blob());container.append(player);
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test media did not load')),5000);player.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});});
    player.currentTime=1.5;
  });
  await panel.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='0.25');
  await video.evaluate(()=>document.querySelector('.bpx-player-video-wrap video').play());
  await panel.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='6.4');
  await video.evaluate(()=>{const p=document.querySelector('.bpx-player-video-wrap video');p.pause();p.currentTime=1.5;});
  await panel.waitForFunction(()=>document.querySelector('.transcript-entry.active-playback')?.dataset.seconds==='0.25'&&document.getElementById('playbackStatus').textContent.startsWith('已暂停')).catch(async error=>{
    console.log('Playback diagnostics',JSON.stringify({page:await video.evaluate(()=>{const p=document.querySelector('.bpx-player-video-wrap video');return {time:p.currentTime,paused:p.paused,ready:p.readyState,duration:p.duration,seekable:[...Array(p.seekable.length)].map((_,i)=>[p.seekable.start(i),p.seekable.end(i)])};}),content:await worker.evaluate(tabId=>chrome.tabs.sendMessage(tabId,{action:'getCurrentTime'}),tabId),panel:await panel.evaluate(()=>({status:document.getElementById('playbackStatus').textContent,active:document.querySelector('.active-playback')?.dataset.seconds}))}));throw error;
  });
  await video.evaluate(()=>{document.querySelector('.bpx-player-video-wrap video').currentTime=3.5;});
  await panel.waitForFunction(()=>!document.querySelector('.transcript-entry.active-playback'));
  console.log('PASS: real sidepanel / custom clock fallback / main-player priority / native playback progression / paused backward seek / caption gaps, all with dynamic injection Blocked');
  console.log('PASS: MV3 load / worker imports / floating content script / background subtitle fetch / source validation / settings sender and persistence / concurrent excerpts');
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
