// Fresh synthetic browser evidence for the Action Desk UI. No real user data.
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
const phase = process.env.TM_ACTION_PHASE || 'after';
const baseline = phase.startsWith('baseline');
const out = process.env.TM_ACTION_OUT || `/tmp/action-desk-ui-evidence/${phase}`;
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4188, strictPort: true } });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const mk = (id, entity, values, links) => ({ id, entity, ns:'demo', ownerId:'demo-user', schemaVersion:1, createdAt:new Date().toISOString(), values:Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{state:'value',value,label:'DEMO'}])), ...(links?{links}:{}) });
const seed = [mk('shot-goal','goal',{'goal.title':'Save for a laptop','goal.smart_specific':'Put 500 BDT aside each week','goal.success':'Jar holds 6000 BDT'}), mk('shot-t1','task',{'task.title':'Open a savings jar','task.done_on':'2026-10-20'},{goal:'shot-goal'}), mk('shot-t2','task',{'task.title':'Set a weekly reminder'},{goal:'shot-goal'}), mk('shot-t3','task',{'task.title':'Read the bill'})];
const populated = [...seed.map(r => r.entity === 'task' && !r.values['task.done_on'] ? {...r,values:{...r.values,'task.minutes':{state:'value',value:25,label:'DEMO'}}} : r), mk('intake-constraint','constraint',{'constraint.weekly_free_hours':6,'constraint.free_from':'20:00','constraint.free_to':'22:00'})];
const designs=(process.env.TM_ACTION_STATES_ONLY==='1'||process.env.TM_ACTION_KEYBOARD_ONLY==='1')?[]:baseline?['light-futuristic']:['light-futuristic','ink-paper','emerald-obsidian','broadsheet'];
const report=[];
try {
for(const design of designs) for(const lang of ['en','bn']) for(const theme of (baseline?['light']:['light','dark'])) for(const scale of [100,200]) {
 const context=await browser.newContext({viewport:{width:360,height:800},colorScheme:theme});
 await context.addInitScript(({design,lang,theme,seed})=>{localStorage.setItem('tm:ui:lang',lang);localStorage.setItem('tm:ui:design',design);localStorage.setItem('tm:ui:theme',theme);localStorage.setItem('tm:ui:dataMode','demo');localStorage.setItem('tm:ui:onboard','skipped'); for(const r of seed)localStorage.setItem(`tm:demo:${r.id}`,JSON.stringify(r));},{design,lang,theme,seed:baseline?seed:populated});
 const page=await context.newPage();
 for(const route of (!baseline && design==='light-futuristic'?['today','journey','journey/goal/shot-goal']:['today','journey'])){
 await page.goto(`http://localhost:4188/#/${route}`);await page.waitForSelector('nav a.tab');
 if(scale===200) await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.waitForTimeout(200);
 const file=`${out}/${design}-${lang}-${theme}-${scale}-${route.replaceAll('/','_')}.png`;
 await page.screenshot({path:file,fullPage:true});
 if(design==='light-futuristic')await page.screenshot({path:file.replace('.png','-viewport.png')});
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await page.waitForTimeout(50);
 if(design==='light-futuristic')await page.screenshot({path:file.replace('.png','-bottom.png')});
 const metrics=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};const nav=document.querySelector('nav');const tabs=[...document.querySelectorAll('nav a.tab')];const tasks=[...document.querySelectorAll('[data-placement]')];const controls=[...document.querySelectorAll('main button,main a.btn,main select,main input:not([type=hidden]):not([type=checkbox]):not([type=radio])')];return{overflow:document.documentElement.scrollWidth>innerWidth,nav:nav?rect(nav):null,tabs:tabs.map(e=>({text:e.textContent.trim(),...rect(e)})),small:controls.filter(e=>{const r=rect(e);return r.width>0&&r.height>0&&(r.width<43.5||r.height<43.5)}).map(e=>({text:e.textContent.trim().slice(0,70),...rect(e)})),tasks:tasks.map(e=>({id:e.dataset.placement,...rect(e),documentTop:e.getBoundingClientRect().top+scrollY})),lastControl:(()=>{const es=controls.filter(e=>e.getBoundingClientRect().height>0);return es.length?rect(es.at(-1)):null})(),goalHeading:document.querySelector('[data-journey-goals]')?.getBoundingClientRect().y,toolsHeading:document.querySelector('.journey-tools')?.getBoundingClientRect().y,focusLinks:[...document.querySelectorAll('[data-placement] a[href^="#/focus/"]')].map(e=>e.getAttribute('href')),nextActions:document.querySelectorAll('[data-next-action]').length,bodyPadding:getComputedStyle(document.body).paddingBottom,mainPadding:getComputedStyle(document.querySelector('main')).paddingBottom,navVariable:getComputedStyle(document.documentElement).getPropertyValue('--nav-height')};});
 await page.evaluate(()=>window.scrollTo(0,0));
 report.push({design,lang,theme,scale,route,file,...metrics});
 }
 await context.close();
}
if(!baseline && process.env.TM_ACTION_KEYBOARD_ONLY!=='1') for(const state of (process.env.TM_ACTION_STATES?process.env.TM_ACTION_STATES.split(','):['empty-real','consent-paused','unknown','offline','save-failure','update-ready','mix','long-title'])) {
 const context=await browser.newContext({viewport:{width:360,height:800},colorScheme:'light'});
 await context.addInitScript(({state,seed,language})=>{
 localStorage.setItem('tm:ui:lang',language || (state==='mix'?'mix':'bn'));localStorage.setItem('tm:ui:dataMode',state==='empty-real'||state==='consent-paused'?'real':'demo');localStorage.setItem('tm:ui:onboard','skipped');
 if(state==='empty-real')localStorage.setItem('tm:consent:real:v1',JSON.stringify({v:1,at:new Date().toISOString()}));
 if(state==='long-title'){seed=seed.map(r=>r.id==='shot-goal'?{...r,values:{...r.values,'goal.title':{state:'value',label:'DEMO',value:'পরিবারের জন্য একটি দীর্ঘমেয়াদি নিরাপদ সঞ্চয় পরিকল্পনা এবং নতুন কাজের কম্পিউটার কেনার প্রস্তুতি'}}}:r);}
 if(!['empty-real','consent-paused'].includes(state))for(const r of seed)localStorage.setItem(`tm:demo:${r.id}`,JSON.stringify(r));
 if(state==='save-failure'){Object.defineProperty(window,'indexedDB',{value:undefined});const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(/^tm:(demo|real):/.test(k))throw new DOMException('Synthetic QA write failure','QuotaExceededError');return set.call(this,k,v)};}
 if(state==='update-ready'){const sw=new EventTarget();sw.controller={};const reg=new EventTarget();reg.waiting={postMessage(){}};reg.installing=null;reg.update=()=>Promise.resolve();sw.register=()=>Promise.resolve(reg);Object.defineProperty(navigator,'serviceWorker',{value:sw});}
 },{state,language:process.env.TM_ACTION_LANG,seed:state==='unknown'?seed:populated});
 const page=await context.newPage();await page.goto('http://localhost:4188/#/today');await page.waitForSelector('nav a.tab');
 if(state==='offline'){await context.setOffline(true);await page.waitForSelector('[data-net=offline]');}
 if(state==='save-failure'){await page.locator('[data-act=task-done]').first().click();await page.waitForSelector('[data-save-failed]');await page.evaluate(()=>location.hash='#/today');await page.waitForSelector('.action-desk');}
 for(const route of (process.env.TM_ACTION_ROUTES?process.env.TM_ACTION_ROUTES.split(','):state==='long-title'?['today','journey/goal/shot-goal']:['today','journey'])){if(route!=='today'){await page.evaluate(r=>location.hash=`#/${r}`,route);await page.waitForTimeout(150);}
 for(const scale of [100,200]){await page.evaluate(s=>document.documentElement.style.fontSize=`${s}%`,scale);await page.waitForTimeout(100);
 const file=`${out}/state-${state}-${scale}-${route.replaceAll('/','_')}.png`;await page.screenshot({path:file,fullPage:true});
 const metrics=await page.evaluate(()=>{const b=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width}};return{overflow:document.documentElement.scrollWidth>innerWidth,tasks:[...document.querySelectorAll('[data-placement]')].map(e=>e.dataset.placement),entryActions:[...document.querySelectorAll('main [data-act=next-go],main .action-desk-agenda a[href^="#/diary"]')].map(e=>({text:e.textContent.trim(),act:e.dataset.act})),demoLeak:document.querySelector('main').textContent.includes('Save for a laptop'),saveWarning:document.querySelector('[data-save-failed]')?b(document.querySelector('[data-save-failed]')):null,consentWarning:document.querySelector('[data-paused]')?b(document.querySelector('[data-paused]')):null,net:document.querySelector('[data-net]')?.getAttribute('data-net'),nav:b(document.querySelector('nav')),update:document.querySelector('[data-update]')?b(document.querySelector('[data-update]')):null,heading:b(document.querySelector('h1')),bodyPadding:getComputedStyle(document.body).paddingBottom};});
 report.push({state,lang:process.env.TM_ACTION_LANG || (state==='mix'?'mix':'bn'),route,scale,file,...metrics});}
 }await context.close();
}
if(process.env.TM_ACTION_KEYBOARD==='1') {
 const context=await browser.newContext({viewport:{width:360,height:800}});
 await context.addInitScript(seed=>{localStorage.setItem('tm:ui:lang','en');localStorage.setItem('tm:ui:dataMode','demo');localStorage.setItem('tm:ui:onboard','skipped');for(const r of seed)localStorage.setItem(`tm:demo:${r.id}`,JSON.stringify(r));},populated);
 const page=await context.newPage();await page.goto('http://localhost:4188/#/today');await page.waitForSelector('[data-placement]');await page.keyboard.press('Tab');
 const firstTab=await page.evaluate(()=>({tag:document.activeElement.tagName,class:document.activeElement.className,text:document.activeElement.textContent,href:document.activeElement.getAttribute('href')}));
 await page.keyboard.press('Enter');await page.waitForTimeout(100);
 const skipDestination=await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,hash:location.hash,inMain:document.activeElement.matches('main')||!!document.activeElement.closest('main')}));
 const taskStops=[];for(let n=0;n<40;n++){await page.keyboard.press('Tab');const stop=await page.evaluate(()=>{const e=document.activeElement;return e.matches('[data-act=task-done],a[href^=\"#/focus/\"]')?{tag:e.tagName,act:e.dataset.act,href:e.getAttribute('href'),text:e.textContent,taskId:e.dataset.taskId}:null;});if(stop)taskStops.push(stop);if(taskStops.length>=4)break;}
 await page.evaluate(()=>location.hash='#/journey');await page.waitForSelector('.journey-tools');const toolStops=[];for(let n=0;n<160;n++){await page.keyboard.press('Tab');const href=await page.evaluate(()=>document.activeElement.closest('.journey-tools')?document.activeElement.getAttribute('href'):null);if(href&&!toolStops.includes(href))toolStops.push(href);if(toolStops.length===18)break;}
 writeFileSync(`${out}/keyboard.json`,JSON.stringify({generated:new Date().toISOString(),firstTab,skipDestination,taskStops,toolStops,pass:firstTab.class==='skip'&&skipDestination.inMain&&taskStops.length===4&&toolStops.length===18},null,2));if(!(firstTab.class==='skip'&&skipDestination.inMain&&taskStops.length===4&&toolStops.length===18))process.exitCode=1;await context.close();
}
} finally {await browser.close();await server.close();writeFileSync(`${out}/report.json`,JSON.stringify({generated:new Date().toISOString(),synthetic:true,viewport:'360x800',phase,screens:report},null,2));}
const violations=report.flatMap(r=>{const failures=[];if(r.overflow)failures.push('horizontal overflow');if(r.small?.length)failures.push('small main controls');if(r.tabs&&(r.tabs.length!==5||r.tabs.some(t=>!t.text||t.right>361||t.x<0||t.height<44)))failures.push('nav labels/targets');if(r.lastControl&&r.nav&&r.lastControl.bottom>r.nav.y+1)failures.push('last control obscured');if(r.route==='today'&&r.tasks?.[0]?.id&&JSON.stringify(r.tasks.map(t=>t.id))!==JSON.stringify(['shot-t2','shot-t3']))failures.push('task ordering');if(r.update&&r.update.bottom>r.nav.top-1)failures.push('update obscures navigation');if(r.state==='empty-real'&&(r.demoLeak||r.tasks.length))failures.push('demo leak in empty real');if(r.state==='save-failure'&&!r.saveWarning)failures.push('save failure warning absent');return failures.map(f=>({file:r.file,failure:f}));});
writeFileSync(`${out}/violations.json`,JSON.stringify(violations,null,2));if(!baseline&&violations.length)process.exitCode=1;
console.log(JSON.stringify({phase,screens:report.length,overflow:report.filter(x=>x.overflow).length,small:report.filter(x=>x.small?.length).length,violations:violations.length}));
