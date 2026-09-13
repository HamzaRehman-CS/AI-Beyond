const {chromium}=require('C:/Users/ztech.pk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    await page.addInitScript(()=>{
      Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});
      Object.defineProperty(navigator,'deviceMemory',{get:()=>2});
    });
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
    await page.evaluate(()=>{
      const section=document.getElementById('updates');
      window.scrollTo(0,section.offsetTop+(section.offsetHeight-innerHeight)*.4);
    });
    await page.waitForTimeout(220);
    const before=await page.evaluate(()=>window.__site.getState().renderStats.chromeDraws);
    await page.evaluate(async()=>{
      const section=document.getElementById('updates');
      const start=section.offsetTop;
      const range=section.offsetHeight-innerHeight;
      for(let i=0;i<36;i++){
        window.scrollTo(0,start+range*(.2+i/60));
        await new Promise(requestAnimationFrame);
      }
    });
    const during=await page.evaluate(()=>window.__site.getState().renderStats.chromeDraws);
    await page.waitForTimeout(180);
    const settled=await page.evaluate(()=>window.__site.getState().renderStats.chromeDraws);
    assert.equal(during,before,'The star must not redraw while scrolling.');
    assert.equal(settled,before+1,'The star should redraw once after scrolling settles.');
    await page.screenshot({path:'reference/updates-smooth-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({starDraws:{before,during,settled},result:'PASS'}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
