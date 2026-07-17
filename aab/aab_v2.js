"use strict";
/* AAB v2 orchestration — © 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8
   Wires the provider + step engine + ship layer into the studio UI. Two modes:
   one-shot (speed) and stepwise (learning/optimisation). Adds Q6 Build&Validate. */

/* provider selection (persisted). Default manual/keyless. */
let AAB_PROV=(function(){
  try{const c=JSON.parse(localStorage.getItem('aab-prov')||'null');if(c)Object.assign(AAB_CONFIG,c);}catch(e){}
  return makeProvider(AAB_CONFIG, (JSON.parse(localStorage.getItem('aab-prov')||'{}')).key);
})();
function setProvider(cfg,key){Object.assign(AAB_CONFIG,cfg);
  try{localStorage.setItem('aab-prov',JSON.stringify(Object.assign({},cfg,{key:key||""})));}catch(e){}
  AAB_PROV=makeProvider(AAB_CONFIG,key);}

/* run one step's AI call: live providers round-trip; manual shows prompt + collects paste */
async function runStep(prompt, schema){
  if(AAB_PROV.live){
    return await AAB_PROV.complete(prompt, schema);   // KeyProvider/HostedProvider return validated JSON
  }
  // manual: resolve via a paste modal
  return await new Promise((resolve,reject)=>{
    modal(`<h2>Paint step — hand this to your AI</h2>
      <p class="muted">Copy the prompt, paste it into your AI (or Open in Claude), then paste the
      JSON it returns below. Keyless and free. <span class="k">Enable a live key in ⚙ for one-tap.</span></p>
      <pre id="mP">${prompt.replace(/</g,'&lt;')}</pre>
      <div class="row">
        <button class="btn" id="mCopy">⧉ Copy prompt</button>
        <button class="btn gold" id="mClaude">Open in Claude</button>
      </div>
      <label class="f">Paste the JSON the AI returned</label>
      <textarea class="f" id="mJson" style="min-height:96px" placeholder='{"elements":[…]}'></textarea>
      <div id="mErr" style="color:#e0685a;font:11px var(--mono);min-height:1.2em"></div>
      <div class="row"><button class="btn" id="mApply">Apply to canvas</button>
      <button class="btn ghost" id="mCancel">Cancel</button></div>`);
    document.getElementById('mCopy').onclick=async()=>{try{await navigator.clipboard.writeText(prompt);}catch(e){}
      document.getElementById('mCopy').textContent="✓ copied";};
    document.getElementById('mClaude').onclick=()=>
      window.open("https://claude.ai/new?q="+encodeURIComponent(prompt),"_blank","noopener");
    document.getElementById('mApply').onclick=()=>{
      try{const j=AAB_PROV.parseAndValidate(document.getElementById('mJson').value, schema);
        closeModal();resolve(j);}
      catch(e){document.getElementById('mErr').textContent=e.message;}
    };
    document.getElementById('mCancel').onclick=()=>{closeModal();reject(new Error("cancelled"));};
  });
}

/* ONE-SHOT: intent -> whole system in a single handoff */
async function paintOneShot(){
  if(!G.intent){openIntent();return;}
  try{
    const j=await runStep(oneShotPrompt(G), "full");
    applyOneShot(G,j);save();draw();refreshQuests();
    toast("Painted "+G.nodes.length+" elements, "+G.edges.length+" flows");
  }catch(e){if(e.message!=="cancelled")toast("✗ "+e.message);}
}

/* STEPWISE: run one step, let the human inspect/optimise, then continue */
let stepIdx=0;
async function paintStep(){
  if(!G.intent){openIntent();return;}
  const steps=STEPS.filter(s=>!s.human);   // intent handled separately
  if(stepIdx>=steps.length){toast("All six steps done — inspect, then Build.");return;}
  const s=steps[stepIdx];
  try{
    const j=await runStep(s.prompt(G), s.schema);
    s.apply(G,j);save();draw();refreshQuests();
    stepIdx++;
    toast(`Step ${stepIdx}/6 · ${s.title} applied`);
  }catch(e){if(e.message!=="cancelled")toast("✗ "+e.message);}
}

/* Q6 BUILD & VALIDATE — the VGC pivot. JS runs in-studio; else external runbook. */
async function openBuildValidate(){
  const runnable=isBrowserRunnable(G);
  modal(`<h2>Build & Validate</h2>
    <p class="muted">The VGC gate: build it, run the oracle, record pass/fail. Only a genuine
    pass verifies an element. ${runnable===true?'This system is <span class="k">browser-runnable</span> — test it here.':
      runnable===false?'This system needs an <span class="k">external</span> build — use the runbook.':
      'Pick where this runs.'}</p>
    ${runnable!==false?`
    <label class="f">System code (JS) — the AI's build output</label>
    <textarea class="f" id="bCode" style="min-height:90px" placeholder="// paste the JS the AI built"></textarea>
    <label class="f">Oracle (JS that returns true on pass, or throws on fail)</label>
    <textarea class="f" id="bOracle" style="min-height:60px" placeholder="return typeof shorten==='function' && shorten('x').length>0;">${firstOracle()}</textarea>
    <button class="btn" id="bRun">▶ Run in studio</button>
    <div id="bOut" style="font:11px var(--mono);margin-top:.5rem;white-space:pre-wrap"></div>`:''}
    ${runnable!==true?`
    <label class="f">External runbook — run this, then paste the tail</label>
    <pre id="bRb">${externalRunbook(G).replace(/</g,'&lt;')}</pre>
    <button class="btn ghost" id="bCopyRb">⧉ Copy runbook</button>
    <label class="f">Paste the result (must contain ALL ORACLES PASSED to verify)</label>
    <textarea class="f" id="bRes" style="min-height:60px"></textarea>
    <button class="btn" id="bRecord">Record external result</button>
    <div id="bOut2" style="font:11px var(--mono);margin-top:.5rem"></div>`:''}
    <button class="btn ghost" id="bClose" style="margin-top:.6rem">Close</button>`);
  if(runnable!==false){
    document.getElementById('bRun').onclick=async()=>{
      const out=document.getElementById('bOut');out.textContent="running…";
      const r=await runInSandbox(document.getElementById('bCode').value,
        document.getElementById('bOracle').value||"return true;");
      out.style.color=r.pass?'#4fd08a':'#e0685a';
      out.textContent=(r.pass?"✓ PASS":"✗ FAIL")+(r.log?"\n"+r.log:"")+(r.err?"\n"+r.err:"");
      if(r.pass){markAllVerified("in-studio JS run: oracle passed");refreshQuests();}
    };
  }
  if(runnable!==true){
    document.getElementById('bCopyRb').onclick=async()=>{try{await navigator.clipboard.writeText(externalRunbook(G));}catch(e){}
      document.getElementById('bCopyRb').textContent="✓ copied";};
    document.getElementById('bRecord').onclick=()=>{
      const res=document.getElementById('bRes').value;
      const out=document.getElementById('bOut2');
      if(/ALL ORACLES PASSED/.test(res)){out.style.color='#4fd08a';out.textContent="✓ recorded — verified";
        markAllVerified("external runbook: ALL ORACLES PASSED");refreshQuests();}
      else{out.style.color='#e0685a';out.textContent="✗ result does not show ALL ORACLES PASSED — not verified";}
    };
  }
  document.getElementById('bClose').onclick=closeModal;
}
function firstOracle(){const n=G.nodes.find(n=>n.oracle);return n?n.oracle.replace(/</g,'&lt;'):"";}
function markAllVerified(why){G.nodes.forEach(n=>{if(n.oracle||n.kind==="gate"){n.state="verified";}});
  save();draw();toast("✓ elements verified — "+why);}

/* Q7 SHIP — GitHub compose-URL seeding, browser OTS, Zenodo */
function openShip(){
  modal(`<h2>Ship & prove</h2>
    <p class="muted">Seed to GitHub (keyless click-to-commit), timestamp with OpenTimestamps,
    then a DOI via your token or misty-doi.</p>
    <h3 style="padding:0;margin:.6rem 0 .2rem;color:var(--water)">1 · Seed to GitHub</h3>
    <div class="row">
      <input class="f" id="gOwner" placeholder="owner" style="flex:1">
      <input class="f" id="gRepo" placeholder="repo" style="flex:1">
      <input class="f" id="gBranch" placeholder="main" style="flex:0 0 90px">
    </div>
    <button class="btn" id="gSeed">Open commit pages</button>
    <div id="gOut" style="font:11px var(--mono);margin-top:.4rem"></div>
    <h3 style="padding:0;margin:.9rem 0 .2rem;color:var(--water)">2 · Timestamp (OTS)</h3>
    <button class="btn ghost" id="oStamp">SHA-256 + OpenTimestamps</button>
    <div id="oOut" style="font:11px var(--mono);margin-top:.4rem;word-break:break-all"></div>
    <h3 style="padding:0;margin:.9rem 0 .2rem;color:var(--water)">3 · DOI (Zenodo)</h3>
    <div class="row">
      <button class="btn ghost" id="zTools">Use misty-doi</button>
      <button class="btn ghost" id="zToken">I have a token</button>
    </div>
    <div id="zOut" style="font:11px var(--mono);margin-top:.4rem;white-space:pre-wrap"></div>
    <button class="btn ghost" id="sClose" style="margin-top:.7rem">Close</button>`);
  const manifest=()=>JSON.stringify(buildManifestV2(),null,2);
  document.getElementById('gSeed').onclick=()=>{
    const owner=document.getElementById('gOwner').value.trim()||"OWNER";
    const repo=document.getElementById('gRepo').value.trim()||"REPO";
    const branch=document.getElementById('gBranch').value.trim()||"main";
    const files=[
      {filename:"aab-manifest.json",content:manifest()},
      {filename:"README.md",content:"# "+(G.intent||"AAB system").slice(0,60)+"\n\nPainted with AAB (آب). VGC method.\n\n© 1993–2026 Abhishek Choudhary · AyeAI\n"}
    ];
    const seeded=seedFiles(owner,repo,branch,files);
    const out=document.getElementById('gOut');out.innerHTML='';
    seeded.forEach(s=>{if(s.tooLong){out.innerHTML+=`⚠ ${s.filename}: too large for URL — paste manually<br>`;}
      else{window.open(s.url,"_blank","noopener");out.innerHTML+=`✓ opened commit page for ${s.filename}<br>`;}});
  };
  document.getElementById('oStamp').onclick=async()=>{
    const out=document.getElementById('oOut');out.textContent="hashing + stamping…";
    const r=await otsStamp(manifest());
    if(r.ok){out.innerHTML=`✓ SHA-256: ${r.sha256}<br>calendar: ${r.calendar}<br>${r.note}`;
      const blob=new Blob([r.proofBytes],{type:"application/octet-stream"});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download="aab-manifest.json.ots";a.click();}
    else{out.innerHTML=`SHA-256: ${r.sha256}<br>⚠ ${r.error}<br>${r.note}`;}
  };
  document.getElementById('zTools').onclick=()=>{
    const g=zenodoGuidance(false);
    document.getElementById('zOut').textContent=g.steps.join("\n");};
  document.getElementById('zToken').onclick=()=>{
    const g=zenodoGuidance(true);
    document.getElementById('zOut').textContent=g.steps.join("\n")+
      "\n(Paste your token when prompted; the studio prepares the deposition, you publish.)";};
  document.getElementById('sClose').onclick=closeModal;
}
function buildManifestV2(){
  return {system_intent:G.intent||"",
    elements:G.nodes.map(n=>({kind:n.kind,name:n.label,state:n.state,intent:n.note,oracle:n.oracle})),
    flows:G.edges.map(e=>{const a=G.nodes.find(n=>n.id===e.a),b=G.nodes.find(n=>n.id===e.b);
      return {from:a&&a.label,to:b&&b.label,label:e.label||""};}),
    provenance:G.publish||{},
    method:"AAB (آب) · VGC", rules:AAB_RULES,
    copyright:"© 1993–2026 Abhishek Choudhary · AyeAI"};
}

/* settings: pick provider (manual / key / hosted-when-enabled) */
function openSettings(){
  modal(`<h2>AI provider</h2>
    <p class="muted">Default is keyless: prompt out, JSON back. Add your own key for one-tap live
    painting. The hosted option lights up when internal API calls are enabled.</p>
    <label class="f">Mode</label>
    <select class="f" id="pMode">
      <option value="manual">Manual — keyless, paste JSON (default)</option>
      <option value="key">My API key — live round-trip</option>
      <option value="hosted"${AAB_CONFIG.hostedEndpoint?'':' disabled'}>Hosted — internal AI ${AAB_CONFIG.hostedEndpoint?'':'(not enabled yet)'}</option>
    </select>
    <div id="pKeyWrap" style="display:none">
      <label class="f">API key (stored locally only)</label>
      <input class="f" id="pKey" type="password" placeholder="sk-ant-…">
    </div>
    <div class="row"><button class="btn" id="pSave">Save</button>
    <button class="btn ghost" id="pClose">Close</button></div>`);
  const sel=document.getElementById('pMode');sel.value=AAB_CONFIG.provider;
  const kw=document.getElementById('pKeyWrap');
  const upd=()=>{kw.style.display=sel.value==="key"?"block":"none";};sel.onchange=upd;upd();
  document.getElementById('pSave').onclick=()=>{
    setProvider({provider:sel.value,hostedEndpoint:AAB_CONFIG.hostedEndpoint,model:AAB_CONFIG.model},
      document.getElementById('pKey')?document.getElementById('pKey').value:"");
    closeModal();toast("Provider: "+AAB_CONFIG.provider);};
  document.getElementById('pClose').onclick=closeModal;
}

/* expose to the shell buttons */
window.AABv2={paintOneShot,paintStep,openBuildValidate,openShip,openSettings,
  resetSteps:()=>{stepIdx=0;}};
