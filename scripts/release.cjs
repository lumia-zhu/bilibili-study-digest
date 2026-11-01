// Cross-platform, dependency-free validation and deterministic ZIP packaging.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
const files = [
  'manifest.json','background.js','settings.js','platforms.js','bilibili-background.js','bilibili-content.js',
  'playback-client.js',
  'vendor/bilibili-digest/wbi.js','vendor/bilibili-digest/bili-api.js','vendor/bilibili-digest/LICENSE','vendor/bilibili-digest/NOTICE.md',
  'content.js','study-core.js','study-ai.js','study-panel.js','sidepanel.html','sidepanel.css','sidepanel.js',
  'options.html','options.css','options.js','icons/icon16.png','icons/icon48.png','icons/icon128.png',
  'prompts/analysis.md','prompts/explain.md','prompts/note-cleanup.md','prompts/translation.md',
  'README.md','README.en.md','README.zh-CN.md','BILIBILI.md','PRIVACY.md','SECURITY.md','LICENSE','NOTICE.md','CHANGELOG.md','VALIDATION.md','DEVELOPMENT.md'
].sort();
const fail = message => { throw new Error(message); };
const run = args => { const result=spawnSync(process.execPath,args,{stdio:'inherit'}); if(result.status!==0) fail(`Check failed: ${args.join(' ')}`); };
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
if(manifest.manifest_version!==3 || !/^\d+\.\d+\.\d+$/.test(manifest.version)) fail('Invalid manifest');
if(manifest.version!==JSON.parse(fs.readFileSync('package.json','utf8')).version) fail('Version mismatch');
const refs = [manifest.background.service_worker,manifest.side_panel.default_path,manifest.options_ui.page,...Object.values(manifest.icons),...Object.values(manifest.action.default_icon),...manifest.content_scripts.flatMap(s=>s.js)];
for(const file of files) {
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()) fail(`Missing or unsafe release file: ${file}`);
  if(!/\.(js|html|md|css|json)$/.test(file)) continue;
  const source=fs.readFileSync(file,'utf8');
  // Report only filenames, never matched credential values.
  if(/\b(?:sk-[A-Za-z0-9_-]{20,}|sd_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b|-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/.test(source)) fail(`Possible credential in ${file}`);
  if(file.endsWith('.js')) {
    run(['--check',file]);
    for(const m of source.matchAll(/\bimportScripts\(([^)]+)\)/g)) for(const q of m[1].matchAll(/["']([^"']+)["']/g)) refs.push(q[1]);
    for(const m of source.matchAll(/loadPromptSection\(\s*["']([^"']+)["']/g)) refs.push(`prompts/${m[1]}`);
  }
  if(file.endsWith('.html')) for(const m of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) if(!/^(?:#|\/\/|[a-z]+:)/i.test(m[1])) refs.push(m[1]);
}
for(const ref of refs) if(!files.includes(ref)) fail(`Asset missing from allowlist: ${ref}`);
// Enumerate tests explicitly so Windows does not depend on shell glob expansion.
run(['--test',...fs.readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>`tests/${f}`)]);
console.log(`Release checks passed: ${files.length} files.`);
if(process.argv.includes('--package')) {
  // ZIP store method (no compression) keeps implementation small and output portable.
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++) n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  const crc=data=>{let n=0xffffffff; for(const b of data) n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
  const chunks=[],central=[]; let offset=0;
  for(const file of files) {
    const name=Buffer.from(file),data=fs.readFileSync(file),checksum=crc(data);
    const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(0x800,6); local.writeUInt16LE(33,12);
    local.writeUInt32LE(checksum,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(name.length,26);
    chunks.push(local,name,data);
    const entry=Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20,4); entry.writeUInt16LE(20,6); entry.writeUInt16LE(0x800,8); entry.writeUInt16LE(33,14);
    entry.writeUInt32LE(checksum,16); entry.writeUInt32LE(data.length,20); entry.writeUInt32LE(data.length,24); entry.writeUInt16LE(name.length,28); entry.writeUInt32LE(offset,42);
    central.push(entry,name); offset+=local.length+name.length+data.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  const archive=Buffer.concat([...chunks,directory,end]); fs.mkdirSync('dist',{recursive:true});
  const output=`dist/bilibili-study-digest-v${manifest.version}.zip`;fs.writeFileSync(output,archive);
  console.log(`Created ${path.resolve(output)}\nSHA-256: ${createHash('sha256').update(archive).digest('hex')}`);
}
