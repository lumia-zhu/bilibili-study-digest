// Settings UI with isolated storage and simulated provider replies; no real keys or AI calls.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'))).version;
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
  try {
    const context = await browser.newContext({viewport:{width:1200,height:1000}});
    await context.route('**/*', route => {
      const url = new URL(route.request().url()), name = url.pathname.slice(1);
      if (url.hostname !== 'settings.test' || !/^[\w./-]+$/.test(name) || name.includes('..')) return route.abort();
      const file = path.join(root, name);
      if (!fs.existsSync(file)) return route.abort();
      const type = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html';
      return route.fulfill({body:fs.readFileSync(file),contentType:type});
    });
    await context.addInitScript(({version}) => {
      const query = new URL(location.href).searchParams;
      const values = {ytd_settings:{schemaVersion:2,provider:'custom',aiApiKey:query.has('empty')?'':'fixture-ai-key',aiBaseUrl:'https://api.deepseek.com',aiModel:'deepseek-v4-flash',supadataApiKey:'fixture-subtitle-key'},ytd_notes:[{text:'Keep this excerpt'}],digest_fixture:{},study_ai_fixture:{}};
      const api = window.__optionsTest = {values,calls:0,writes:0,permissionRequests:[],grant:true,failSave:false,defer:false,confirm:false,confirmCalls:0,holdSave:false};
      const local = {
        get:async keys => {
          if(query.has('load-failure') && keys==='ytd_settings')throw Error('Fixture read error');
          return structuredClone(keys===null ? values : Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,values[k]])));
        },
        set:async items => {
          if(api.failSave)throw Error('Fixture storage error');
          if(api.holdSave && items.ytd_settings)await new Promise(resolve=>api.finishSave=resolve);
          api.writes++;Object.assign(values,structuredClone(items));
        },
        remove:async keys => (Array.isArray(keys)?keys:[keys]).forEach(k=>delete values[k]),
        clear:async()=>Object.keys(values).forEach(k=>delete values[k])
      };
      window.chrome={storage:{local},permissions:{request:async p=>{api.permissionRequests.push(p);return api.grant;}},runtime:{getManifest:()=>({version}),sendMessage:async message=>{
        if(message.action!=='testAiConnection')throw Error('Unexpected message');
        api.calls++;api.tested=structuredClone(values.ytd_settings);
        if(api.defer)return new Promise(resolve=>api.finishTest=resolve);
        return api.result || {success:true};
      }}};
      window.confirm=()=>{api.confirmCalls++;return api.confirm;};
    },{version});
    const page = await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const open = async suffix => {
      await page.goto('http://settings.test/options.html'+(suffix||''));
      await page.waitForFunction(()=>!document.getElementById('saveSettingsBtn').disabled);
    };
    await open('?empty');
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
    assert.equal(await page.locator('#supadataApiKey').isVisible(),false);
    assert.equal(await page.locator('#youtubeSettings').isVisible(),false);
    assert.doesNotMatch(await page.locator('body').innerText(),/Supadata|YouTube/);
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    await page.locator('#testConnectionBtn').dispatchEvent('click');
    assert.equal(await page.evaluate(()=>__optionsTest.calls),0);
    const positions=await page.locator('.form-actions button').evaluateAll(nodes=>nodes.map(n=>n.id));
    assert.deepEqual(positions,['saveSettingsBtn','testConnectionBtn']);
    fs.mkdirSync(path.join(root,'dist'),{recursive:true});
    await page.screenshot({path:path.join(root,'dist',`settings-v${version}-desktop.png`),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:360,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,'dist',`settings-v${version}-mobile.png`),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:1200,height:1000});

    await page.locator('#aiApiKey').fill('fixture-new-key');
    assert.match(await page.locator('#testConnectionBtn').innerText(),/需先保存/);
    await page.locator('#testConnectionBtn').dispatchEvent('click');
    assert.equal(await page.evaluate(()=>__optionsTest.calls),0);
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>!document.getElementById('testConnectionBtn').disabled);
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_settings.supadataApiKey),'fixture-subtitle-key');
    assert.equal(await page.evaluate(()=>__optionsTest.calls),0);
    await page.locator('#testConnectionBtn').click();
    await page.waitForFunction(()=>document.getElementById('connectionStatus').dataset.tone==='success');
    assert.equal(await page.evaluate(()=>__optionsTest.tested.aiApiKey),'fixture-new-key');

    // Both a successful and a failed response must be discarded after editing.
    for(const reply of [{success:true},{success:false,error:'Outdated failure'}]) {
      await page.evaluate(()=>{__optionsTest.defer=true;});
      await page.locator('#testConnectionBtn').click();
      await page.waitForFunction(()=>typeof __optionsTest.finishTest==='function');
      const calls=await page.evaluate(()=>__optionsTest.calls);
      await page.locator('#testConnectionBtn').dispatchEvent('click');
      assert.equal(await page.evaluate(()=>__optionsTest.calls),calls);
      await page.locator('#aiApiKey').fill('fixture-edited-key');
      await page.evaluate(reply=>{__optionsTest.finishTest(reply);delete __optionsTest.finishTest;__optionsTest.defer=false;},reply);
      await page.waitForFunction(()=>!document.getElementById('saveSettingsBtn').disabled);
      assert.equal(await page.locator('#connectionStatus').innerText(),'');
      assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
      await page.locator('#aiApiKey').fill('fixture-new-key');
      assert.equal(await page.locator('#testConnectionBtn').isDisabled(),false);
    }

    await page.locator('.advanced-settings summary').click();
    await page.locator('#aiBaseUrl').fill('https://model.example/v1/chat/completions');
    await page.locator('#aiModel').fill('fixture-model');
    await page.evaluate(()=>{__optionsTest.grant=false;});
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>document.getElementById('saveStatus').dataset.tone==='error');
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_settings.aiBaseUrl),'https://api.deepseek.com');
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    await page.evaluate(()=>{__optionsTest.grant=true;__optionsTest.failSave=true;});
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>document.getElementById('saveStatus').textContent.includes('Fixture storage error'));
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    await page.evaluate(()=>{__optionsTest.failSave=false;});
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>!document.getElementById('testConnectionBtn').disabled);
    assert.equal(await page.locator('#aiBaseUrl').inputValue(),'https://model.example/v1');
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_settings.supadataApiKey),'fixture-subtitle-key');
    await page.evaluate(()=>{__optionsTest.result={success:false,error:'Fixture provider error'};});
    await page.locator('#testConnectionBtn').click();
    await page.waitForFunction(()=>document.getElementById('connectionStatus').dataset.tone==='error');
    assert.match(await page.locator('#connectionStatus').innerText(),/Fixture provider error/);

    // Another settings page must not silently change which configuration is tested.
    await page.evaluate(()=>{__optionsTest.values.ytd_settings.aiModel='elsewhere-model';});
    const before=await page.evaluate(()=>__optionsTest.calls);
    await page.locator('#testConnectionBtn').click();
    await page.waitForFunction(()=>document.getElementById('connectionStatus').textContent.includes('其他页面'));
    assert.equal(await page.evaluate(()=>__optionsTest.calls),before);
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    await page.locator('[data-language="en"]').click();
    assert.equal(await page.locator('#testConnectionBtn').innerText(),'Test connection (save first)');
    assert.equal(await page.locator('#aiModel').inputValue(),'fixture-model');
    assert.equal(await page.locator('#aiApiKey').inputValue(),'fixture-new-key');
    await page.setViewportSize({width:360,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>!document.getElementById('testConnectionBtn').disabled);
    await page.reload();
    await page.waitForFunction(()=>!document.getElementById('saveSettingsBtn').disabled);
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN'); // Fresh fixture storage per load.
    await page.locator('.advanced-settings summary').click();
    await page.locator('#aiModel').fill('snapshot-model');
    await page.evaluate(()=>{__optionsTest.holdSave=true;});
    await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>typeof __optionsTest.finishSave==='function');
    await page.locator('#aiModel').fill('newer-draft');
    await page.evaluate(()=>{__optionsTest.finishSave();__optionsTest.holdSave=false;});
    await page.waitForFunction(()=>!document.getElementById('saveSettingsBtn').disabled);
    assert.equal(await page.locator('#aiModel').inputValue(),'newer-draft');
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_settings.aiModel),'snapshot-model');
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    await page.locator('#clearCacheBtn').click();
    await page.waitForFunction(()=>!('digest_fixture' in __optionsTest.values));
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_notes.length),1);
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_settings.supadataApiKey),'fixture-subtitle-key');
    await page.locator('.data-management summary').click();
    await page.locator('#resetBtn').click();
    await page.locator('#clearNotesBtn').click();
    assert.equal(await page.evaluate(()=>__optionsTest.confirmCalls),2);
    assert.equal(await page.evaluate(()=>__optionsTest.values.ytd_notes.length),1);
    await page.goto('http://settings.test/options.html?load-failure');
    await page.waitForFunction(()=>document.getElementById('saveStatus').dataset.tone==='error');
    assert.equal(await page.locator('#saveSettingsBtn').isDisabled(),true);
    assert.equal(await page.locator('#testConnectionBtn').isDisabled(),true);
    assert.equal(await page.locator('#aiApiKey').isDisabled(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: hidden YouTube settings retained / save before test / no automatic requests / duplicate test guard / edit during test or save / permission and storage failure / external changes / localization / local data / responsive layout');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
