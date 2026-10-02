// Isolated renderer regression checks. No database, uploads or customer records.
import { build } from "esbuild";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const output = "qa-output";
await mkdir(output, { recursive: true });
const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from '../src/components/product/Cylindrical3DScene';
const params = new URLSearchParams(location.search);
const bottle = params.get('product') === 'bottle';
const canvas = document.createElement('canvas'); canvas.width=1500; canvas.height=700;
const context=canvas.getContext('2d');
context.fillStyle='#f4dfad'; context.fillRect(0,0,1500,700);
context.fillStyle='#d8212b'; context.fillRect(0,0,120,700); context.fillRect(1380,0,120,700);
context.strokeStyle='#17335d'; context.lineWidth=5;
for(let x=0;x<=1500;x+=125){context.beginPath();context.moveTo(x,0);context.lineTo(x,700);context.stroke();}
for(let y=0;y<=700;y+=100){context.beginPath();context.moveTo(0,y);context.lineTo(1500,y);context.stroke();}
context.fillStyle='#17335d'; context.font='bold 100px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('FRONT',750,350);
context.font='bold 48px sans-serif';context.fillText('LEFT',180,70);context.fillText('RIGHT',1300,70);
const artworkUrl=canvas.toDataURL('image/png');
const views=[{id:'front',name:'Front',angleDeg:0},{id:'left',name:'Left',angleDeg:-20},{id:'right',name:'Right',angleDeg:20}];
const template={physical:{width:7.5,height:3.5},cylindrical3d:bottle
 ?{modelRef:'procedural:bottle-v1',radius:.92,bodyHeight:3.35,wrapCoverageDeg:300,cameraDistance:6.4,cameraPitchDeg:3,metalness:.42}
 :{modelRef:'procedural:mug-v1',radius:1.18,bodyHeight:2.45,wrapCoverageDeg:270,cameraDistance:6.2,cameraPitchDeg:5,handleSide:params.get('handle')||'right',printableTopMarginPct:Number(params.get('margin')||0),printableBottomMarginPct:Number(params.get('margin')||0)}};
function unavailable(){document.getElementById('failure').hidden=false;}
function App(){const [view,setView]=useState(views[0]);return <>
 <h1>{bottle?'Bottle':'Mug'} · isolated production renderer</h1>
 <img alt='Flat wrap source' src={artworkUrl} style={{width:'100%',maxWidth:620}}/>
 <nav>{views.map(v=><button key={v.id} onClick={()=>setView(v)}>{v.name}</button>)}</nav>
 <div id='main-preview'><Scene artworkUrl={artworkUrl} template={template} view={view} onUnavailable={unavailable}/></div>
 <div id='thumbs'>{views.map(v=><div className='thumb' key={v.id}><Scene artworkUrl={artworkUrl} template={template} view={v} onUnavailable={unavailable}/></div>)}</div>
 <p id='failure' hidden>3D unavailable</p>
 </>;}
createRoot(document.getElementById('root')).render(<App/>);
`;
await writeFile(`${output}/entry.tsx`, entry);
await build({entryPoints:[`${output}/entry.tsx`],outfile:`${output}/bundle.js`,bundle:true,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}});
const bundle = await readFile(`${output}/bundle.js`);
const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:Arial;background:#fff}#main-preview{width:100%;max-width:620px;aspect-ratio:1}#main-preview>div,.thumb>div{width:100%;height:100%}nav{padding:12px 0}button{padding:8px 16px;margin-right:8px}#thumbs{display:flex;gap:10px}.thumb{width:72px;height:72px}#failure{color:red}</style><div id="root"></div><script src="/bundle.js"></script>`;
const server = createServer((req,res)=>{res.setHeader("Content-Type",req.url==="/bundle.js"?"application/javascript":"text/html");res.end(req.url==="/bundle.js"?bundle:html);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const browser = await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const results=[];
try {
  for (const scenario of [
    {name:"mug-desktop",width:1440,height:1100,query:""},
    {name:"mug-mobile",width:390,height:844,query:""},
    {name:"bottle-mobile",width:390,height:844,query:"?product=bottle"},
    {name:"mug-left-handle",width:900,height:1000,query:"?handle=left"},
    {name:"mug-margins",width:900,height:1000,query:"?margin=20"},
  ]) {
    const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    await page.goto(`http://127.0.0.1:${server.address().port}/${scenario.query}`);
    for (const view of ["Front","Left","Right"]) {
      await page.getByRole("button",{name:view,exact:true}).click();
      await page.locator(`#main-preview canvas[data-preview-ready="true"][data-preview-view="${view.toLowerCase()}"]`).waitFor({timeout:20000});
      await page.locator('#thumbs canvas[data-preview-ready="true"]').nth(2).waitFor({timeout:20000});
      assert.equal(await page.locator('#failure').isVisible(),false);
      const preview=await page.locator('#main-preview').screenshot();
      const png=PNG.sync.read(preview);
      let cream=0;for(let i=0;i<png.data.length;i+=4){const [r,g,b]=png.data.subarray(i,i+3);if(r>150&&g>120&&b<200&&r>b+20)cream++;}
      assert.ok(cream>png.width*png.height*.05,`Missing textured artwork in ${scenario.name}/${view}`);
      await writeFile(`${output}/${scenario.name}-${view.toLowerCase()}.png`,preview);
      await page.screenshot({path:`${output}/${scenario.name}-${view.toLowerCase()}-context.png`,fullPage:true});
    }
    assert.deepEqual(errors,[],`${scenario.name} browser errors`);
    results.push({scenario:scenario.name,status:"PASS",views:["Front","Left","Right"],width:scenario.width});
    await page.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify({scope:"isolated production Cylindrical3DScene; not full customizer or upload flow",results},null,2));
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
