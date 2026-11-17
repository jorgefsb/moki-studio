// Ventana de 20 s reales con el sol montado; mismo arranque en master y rama.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const require=createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const {chromium}=require('playwright');
const [url,file]=process.argv.slice(2);
const conditions={utc:new Date().toISOString(),loadavg:readFileSync('/proc/loadavg','utf8').trim(),resources:readFileSync('/tmp/moki-recursos.txt','utf8')};
const browser=await chromium.launch({executablePath:'/home/jorgefsb/.local/bin/microsoft-edge-stable',args:['--headless=new','--use-angle=vulkan','--enable-gpu','--ignore-gpu-blocklist']});
const errors=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 await ctx.addInitScript(()=>{localStorage.clear();localStorage.setItem('moki.tutorial','1');});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(`${url}/?debug&ir=primera&god`);
 await p.waitForFunction(()=>window.__moki?.moki&&window.__moki.scene.scenes[0].capas?.cargadas,null,{polling:250,timeout:90000});
 const result=await p.evaluate(async()=>{
  const s=window.__moki.scene.scenes[0];s.startGame();s.tut={stage:4,state:'off'};s.god=true;
  s.press();s.release(); // cierra la intro de boceto si está presente
  const frames=[];let last=performance.now(),go=true,sunFrames=0,playFrames=0,id;
  const begin=last;
  const tick=now=>{
   if(!go)return;frames.push(now-last);last=now;
   if(s.screen==='play')playFrames++;
   const sun=s.children.list.find(o=>o.texture?.key==='luz_disco');
   if(sun?.visible&&sun.alpha>0&&s.capas?.cargadas)sunFrames++;
   id=requestAnimationFrame(tick);
  };
  id=requestAnimationFrame(tick);await new Promise(r=>setTimeout(r,20000));go=false;cancelAnimationFrame(id);
  const elapsedMs=performance.now()-begin;frames.sort((a,b)=>a-b);
  const gl=s.game.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
  return {n:frames.length,elapsedMs,fps:frames.length*1000/elapsedMs,p95:frames[Math.floor(frames.length*.95)],sunFrames,playFrames,gameMs:s.t,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
 });
 writeFileSync(file,JSON.stringify({url,conditions,...result,errors},null,2));console.log(JSON.stringify(result));
 if(!result.sunFrames||!result.playFrames||errors.length)process.exitCode=1;
}finally{await browser.close();}
