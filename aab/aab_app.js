"use strict";
/* AAB studio engine — © 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8
   Paint a system; the AI + VGC implement it. Grounded: sketch→named→verified(oracle). */

/* ---- the palette: the vocabulary of a system, per the AAB definition ---- */
const BRUSHES=[
  {k:"actor",     name:"Actor",     hue:"#e0a34a", ico:'<circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>'},
  {k:"component", name:"Component",hue:"#3fb6d8", ico:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/>'},
  {k:"store",     name:"Store",    hue:"#8a97b8", ico:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/>'},
  {k:"gate",      name:"Gate",     hue:"#4fd08a", ico:'<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M9 12l2 2 4-4"/>'},
  {k:"interface", name:"Interface",hue:"#c9a44e", ico:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M3 9h18M7 21h10"/>'},
  {k:"environment",name:"Env",     hue:"#6f8b7a", ico:'<path d="M12 3a9 9 0 100 18 9 9 0 000-18z"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'},
];
const BR=Object.fromEntries(BRUSHES.map(b=>[b.k,b]));

/* ---- the VGC quests: stages that only complete with typed evidence ---- */
const QUESTS=[
  {k:"intent",  n:"Q1", t:"State intent",   need:g=>g.intent&&g.intent.length>12,
    hint:"Write, in your words, what this system is for. Preserved verbatim, forever."},
  {k:"paint",   n:"Q2", t:"Paint the system",need:g=>g.nodes.length>=3,
    hint:"Place at least three elements — an actor, a component, and one more."},
  {k:"wire",    n:"Q3", t:"Wire the flows", need:g=>g.edges.length>=2,
    hint:"Draw at least two flows between elements."},
  {k:"name",    n:"Q4", t:"Name everything",need:g=>g.nodes.length>0&&g.nodes.every(n=>n.state!=="sketch"),
    hint:"Every element must be named — no sketches left. (+XP each)"},
  {k:"gate",    n:"Q5", t:"Place a gate",   need:g=>g.nodes.some(n=>n.kind==="gate"),
    hint:"Every serious system has a verification gate. Place at least one."},
  {k:"oracle",  n:"Q5+",t:"Record an oracle",need:g=>g.nodes.some(n=>n.state==="verified"),
    hint:"Mark one element verified — but only by recording the oracle that passed. No oracle, no glow."},
  {k:"validate",n:"Q6", t:"Build & Validate",need:g=>g.nodes.some(n=>n.state==="verified"),
    hint:"The VGC gate: build it, run the oracle, record pass/fail. JS runs in-studio; else a runbook."},
  {k:"publish", n:"Q7", t:"Wire to provenance",need:g=>g.publish&&g.publish.tool,
    hint:"Connect to the real IP machinery: misty-doi / publish_paper.sh (DOI+OTS) or patent_track.sh."},
];

/* ---- persistent grimoire ---- */
const KEY="aab-canvas-v1";
let G=load();
function blank(){return {intent:"",nodes:[],edges:[],xp:0,publish:{tool:"",note:""},created:Date.now()};}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.nodes)return s;}catch(e){}return blank();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(G));}catch(e){}}

/* ---- canvas ---- */
const cv=document.getElementById('canvas'), cx=cv.getContext('2d');
let DPR=Math.min(devicePixelRatio||1,2), W=0, H=0;
function resize(){const r=cv.parentElement.getBoundingClientRect();
  W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
  cx.setTransform(DPR,0,0,DPR,0,0);draw();}
let brush=null, sel=null, wiring=null, panPt=null;
function setBrush(k){brush=(brush===k?null:k);renderPalette();
  hint(brush?`Tap the canvas to place a ${BR[brush].name.toLowerCase()}.`:"Tap a brush to paint. Drag node→node to wire.");}
function nodeAt(x,y){for(let i=G.nodes.length-1;i>=0;i--){const n=G.nodes[i];
  if(Math.hypot(n.x-x,n.y-y)<34)return n;}return null;}
function draw(){
  cx.clearRect(0,0,W,H);
  // faint water grid
  cx.strokeStyle='rgba(63,182,216,.06)';cx.lineWidth=1;
  for(let x=0;x<W;x+=32){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();}
  for(let y=0;y<H;y+=32){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke();}
  // edges (flows)
  for(const e of G.edges){const a=G.nodes.find(n=>n.id===e.a),b=G.nodes.find(n=>n.id===e.b);
    if(!a||!b)continue;
    cx.strokeStyle='rgba(63,182,216,.5)';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(a.x,a.y);
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    cx.quadraticCurveTo(mx,my-18,b.x,b.y);cx.stroke();
    // arrowhead
    const ang=Math.atan2(b.y-my,b.x-mx);
    cx.fillStyle='rgba(63,182,216,.7)';cx.beginPath();
    cx.moveTo(b.x,b.y);cx.lineTo(b.x-9*Math.cos(ang-0.4),b.y-9*Math.sin(ang-0.4));
    cx.lineTo(b.x-9*Math.cos(ang+0.4),b.y-9*Math.sin(ang+0.4));cx.fill();
  }
  if(wiring){cx.strokeStyle='rgba(201,164,78,.7)';cx.setLineDash([4,4]);cx.lineWidth=2;
    cx.beginPath();cx.moveTo(wiring.x0,wiring.y0);cx.lineTo(wiring.x,wiring.y);cx.stroke();cx.setLineDash([]);}
  // nodes
  for(const n of G.nodes){const b=BR[n.kind];
    const glow=n.state==="verified";
    cx.save();
    if(glow){cx.shadowColor=b.hue;cx.shadowBlur=18;}
    cx.fillStyle=n.state==="sketch"?'rgba(10,28,46,.7)':'rgba(10,28,46,.95)';
    cx.strokeStyle=n.state==="verified"?'#4fd08a':n.state==="named"?b.hue:'rgba(127,151,171,.5)';
    cx.lineWidth=n===sel?3:2;
    if(n.state==="sketch")cx.setLineDash([5,4]);
    roundRect(n.x-30,n.y-24,60,48,10);cx.fill();cx.stroke();cx.setLineDash([]);
    cx.restore();
    // icon glyph
    cx.fillStyle=b.hue;cx.font='600 9px ui-monospace,monospace';cx.textAlign='center';
    cx.fillText(b.name.toUpperCase(),n.x,n.y-10);
    cx.fillStyle=n.state==="sketch"?'#7f97ab':'#eaf2f8';cx.font='600 11px system-ui';
    cx.fillText((n.label||'…').slice(0,11),n.x,n.y+6);
    if(glow){cx.fillStyle='#4fd08a';cx.font='8px ui-monospace';cx.fillText('✓ verified',n.x,n.y+18);}
    else if(n.state==="named"){cx.fillStyle=b.hue;cx.font='8px ui-monospace';cx.fillText('named',n.x,n.y+18);}
  }
}
function roundRect(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);
  cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);
  cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}

/* ---- pointer: place / select / wire / move ---- */
let downPt=null,moved=false;
cv.addEventListener('pointerdown',ev=>{const p=xy(ev);downPt=p;moved=false;
  const hit=nodeAt(p.x,p.y);
  if(brush&&!hit){addNode(brush,p.x,p.y);brush=null;renderPalette();return;}
  if(hit){sel=hit;wiring={node:hit,x0:hit.x,y0:hit.y,x:p.x,y:p.y};}
  try{cv.setPointerCapture(ev.pointerId)}catch(e){}
});
cv.addEventListener('pointermove',ev=>{const p=xy(ev);
  if(!downPt)return;moved=Math.hypot(p.x-downPt.x,p.y-downPt.y)>6;
  if(wiring){const over=nodeAt(p.x,p.y);
    if(over&&over!==wiring.node){wiring.x=over.x;wiring.y=over.y;wiring.target=over;}
    else{wiring.x=p.x;wiring.y=p.y;wiring.target=null;}
    // if dragging the node itself with no target intent yet, move it
    draw();}
});
cv.addEventListener('pointerup',ev=>{const p=xy(ev);
  if(wiring){
    const over=nodeAt(p.x,p.y);
    if(over&&over!==wiring.node){addEdge(wiring.node.id,over.id);}
    else if(!moved){openInspector(wiring.node);}
    else if(moved){wiring.node.x=p.x;wiring.node.y=p.y;save();} // moved a node
    wiring=null;
  }
  downPt=null;draw();refreshQuests();
});

function xy(ev){const r=cv.getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top};}
let nextId=Math.max(0,...G.nodes.map(n=>n.id||0))+1;
function addNode(kind,x,y){G.nodes.push({id:nextId++,kind,label:"",state:"sketch",x,y,note:"",oracle:""});
  save();draw();refreshQuests();award(1,"element sketched");openInspector(G.nodes[G.nodes.length-1]);}
function addEdge(a,b){if(a===b)return;if(G.edges.some(e=>e.a===a&&e.b===b))return;
  G.edges.push({a,b});save();draw();refreshQuests();award(1,"flow wired");hint("Flow wired.");}

/* ---- XP / level ---- */
function award(n,why){G.xp+=n;save();
  document.getElementById('xp').textContent=G.xp+" XP";
  const done=QUESTS.filter(q=>q.need(G)).length;
  document.getElementById('lvl').textContent=
    done>=7?"Shipped":done>=5?"Verifying":done>=3?"Building":done>=1?"Painting":"Sketching";
  if(why)hint("+"+n+" XP · "+why);}

/* ---- inspector drawer: name, ground, and record oracles ---- */
const drawer=document.getElementById('drawer');
function openInspector(n){sel=n;draw();
  document.getElementById('drawerTitle').textContent=BR[n.kind].name;
  const body=document.getElementById('drawerBody');
  const stateChip=n.state==="verified"?'<span class="chipstate st-verified">✓ verified</span>':
    n.state==="named"?'<span class="chipstate st-named">named</span>':
    '<span class="chipstate st-sketch">sketch</span>';
  body.innerHTML=`
    <div>${stateChip}</div>
    <label class="f">Name</label>
    <input class="f" id="iName" value="${(n.label||'').replace(/"/g,'&quot;')}" placeholder="e.g. Ingest service">
    <label class="f">What it does (intent for this element)</label>
    <textarea class="f" id="iNote" placeholder="Plain words. Preserved verbatim.">${n.note||''}</textarea>
    <label class="f">Verifying oracle (required to mark verified)</label>
    <input class="f" id="iOracle" value="${(n.oracle||'').replace(/"/g,'&quot;')}"
      placeholder="e.g. tests/ingest_test.sh passes; or: 10/10 pytest green">
    <button class="btn" id="iSave">Save & name</button>
    <button class="btn ${n.oracle?'gold':'ghost'}" id="iVerify">
      ${n.state==="verified"?'✓ Verified (recorded)':'Mark verified — needs an oracle'}</button>
    <button class="btn ghost" id="iDel">Delete</button>
  `;
  drawer.classList.add('on');
  document.getElementById('iSave').onclick=()=>{
    n.label=document.getElementById('iName').value.trim();
    n.note=document.getElementById('iNote').value.trim();
    n.oracle=document.getElementById('iOracle').value.trim();
    if(n.label&&n.state==="sketch"){n.state="named";award(2,"named "+n.label);}
    save();draw();refreshQuests();hint("Saved.");openInspector(n);
  };
  document.getElementById('iVerify').onclick=()=>{
    const orc=document.getElementById('iOracle').value.trim();
    if(!orc){hint("No oracle, no glow. Record which oracle passed.");
      document.getElementById('iOracle').focus();return;}
    n.oracle=orc;if(!n.label)n.label=BR[n.kind].name;
    n.state="verified";award(5,"verified "+n.label+" via oracle");save();draw();refreshQuests();
    toast("✓ "+n.label+" verified — oracle recorded: "+orc.slice(0,40));openInspector(n);
  };
  document.getElementById('iDel').onclick=()=>{
    G.nodes=G.nodes.filter(x=>x!==n);G.edges=G.edges.filter(e=>e.a!==n.id&&e.b!==n.id);
    save();draw();refreshQuests();drawer.classList.remove('on');
  };
}
// tap outside drawer closes it
document.getElementById('canvasWrap').addEventListener('pointerdown',()=>{},{passive:true});

/* ---- quests bar ---- */
function refreshQuests(){
  const box=document.getElementById('quests');box.innerHTML='';
  let firstOpen=null;
  QUESTS.forEach(q=>{const done=q.need(G);if(!done&&!firstOpen)firstOpen=q.k;
    const el=document.createElement('div');
    el.className='quest'+(done?' done':'')+(q.k===firstOpen?' active':'');
    el.innerHTML=`<div class="qn">${q.n}${done?' ✓':''}</div><div class="qt">${q.t}</div>
      <div class="qb"><i style="width:${done?100:0}%"></i></div>`;
    el.onclick=()=>{if(q.k==='intent')openIntent();
      else if(q.k==='validate'&&window.AABv2)window.AABv2.openBuildValidate();
      else if(q.k==='publish'&&window.AABv2)window.AABv2.openShip();
      else{hint(q.hint);}};
    box.appendChild(el);});
  award(0);
}

/* ---- intent (Q1) — preserved verbatim ---- */
function openIntent(){
  modal(`<h2>State your intent</h2>
    <p class="muted">In your own words: what is this system for? This is preserved <b>verbatim</b>
    for continuity, audit and gap-analysis. It is never rewritten.</p>
    <textarea class="f" id="mIntent" style="min-height:120px;margin-top:.6rem"
      placeholder="e.g. A local-first tool that lets a clinic book, remind and follow up patients without cloud lock-in.">${G.intent||''}</textarea>
    <div class="row"><button class="btn" id="mSave">Save intent</button>
    <button class="btn ghost" id="mClose">Close</button></div>`);
  document.getElementById('mSave').onclick=()=>{G.intent=document.getElementById('mIntent').value.trim();
    save();refreshQuests();closeModal();if(G.intent)award(3,"intent stated");};
  document.getElementById('mClose').onclick=closeModal;
}

/* ---- publish (Q7) — the real provenance machinery ---- */
function openPublish(){
  modal(`<h2>Wire to provenance</h2>
    <p class="muted">Connect the painting to the real publishing & IP machinery. Filing stays
    with you and counsel — this records the route, it does not file.</p>
    <label class="f">Route</label>
    <select class="f" id="mTool">
      <option value="">— choose —</option>
      <option value="misty-doi">misty-doi — DOI + OpenTimestamps (software/data)</option>
      <option value="publish_paper.sh">publish_paper.sh — paper → DOI + OTS</option>
      <option value="patent_track.sh">patent_track.sh — OTS disclosure as priority-date evidence</option>
    </select>
    <label class="f">Note (what gets published)</label>
    <textarea class="f" id="mNote" placeholder="e.g. the AAB manifest + README as a v0.1 software record">${G.publish.note||''}</textarea>
    <div class="row"><button class="btn gold" id="mSave">Record route</button>
    <button class="btn ghost" id="mClose">Close</button></div>`);
  document.getElementById('mTool').value=G.publish.tool||'';
  document.getElementById('mSave').onclick=()=>{
    G.publish={tool:document.getElementById('mTool').value,note:document.getElementById('mNote').value.trim()};
    save();refreshQuests();closeModal();if(G.publish.tool)award(4,"provenance route set");};
  document.getElementById('mClose').onclick=closeModal;
}

/* ---- the payoff: the painting → an AI build prompt (the manifest) ---- */
function buildManifest(){
  const nodes=G.nodes.map(n=>({kind:n.kind,name:n.label||"(unnamed)",state:n.state,
    intent:n.note||"",oracle:n.oracle||""}));
  const edges=G.edges.map(e=>{const a=G.nodes.find(x=>x.id===e.a),b=G.nodes.find(x=>x.id===e.b);
    return {from:a?a.label||a.kind:"?",to:b?b.label||b.kind:"?"};});
  return {system_intent:G.intent||"(intent not yet stated)",
    elements:nodes,flows:edges,
    verification:{gates:nodes.filter(n=>n.kind==="gate").map(n=>n.name),
      verified:nodes.filter(n=>n.state==="verified").map(n=>({name:n.name,oracle:n.oracle}))},
    provenance:G.publish,
    method:"AAB (آب) · Verification-Gated Human–AI Co-Development",
    rules:["Preserve the stated intent verbatim.",
      "Implement only what is painted; ask before adding.",
      "Nothing is 'done' without a recorded, runnable oracle.",
      "Copyright © 1993–2026 Abhishek Choudhary · AyeAI. GPL-3.0-or-later for software."]};
}
function buildPrompt(){
  const m=buildManifest();
  return `You are implementing a system painted in the AAB studio, under the Verification-Gated
(VGC) method. Build ONLY what is painted. Preserve the intent verbatim. Nothing is complete
without a runnable oracle.

SYSTEM INTENT (verbatim):
${m.system_intent}

ELEMENTS:
${m.elements.map(e=>`- [${e.kind}] ${e.name} — ${e.intent||"(no note)"}${e.oracle?` · oracle: ${e.oracle}`:""} · ${e.state}`).join("\n")}

FLOWS:
${m.flows.map(f=>`- ${f.from} → ${f.to}`).join("\n")||"- (none yet)"}

VERIFICATION GATES: ${m.verification.gates.join(", ")||"(none — add at least one)"}
ALREADY VERIFIED: ${m.verification.verified.map(v=>`${v.name} (${v.oracle})`).join("; ")||"(none yet)"}
PROVENANCE ROUTE: ${m.provenance.tool||"(not set)"} ${m.provenance.note?"· "+m.provenance.note:""}

RULES:
${m.rules.map(r=>"- "+r).join("\n")}

Deliver: a plan that maps each element to a file/module, each flow to an interface, and each
gate to a concrete oracle (a script/test that returns pass/fail). Do not invent scope. Ask
before assuming. Provide the oracle commands so each element can move to "verified".`;
}
function openBuild(){
  const p=buildPrompt();
  modal(`<h2>Your system → an AI build prompt</h2>
    <p class="muted">This is the painting, serialized as a VGC manifest. Hand it to any AI to
    implement. Your intent is preserved verbatim.</p>
    <pre id="mPrompt">${p.replace(/</g,'&lt;')}</pre>
    <div class="row">
      <button class="btn" id="mCopy">⧉ Copy prompt</button>
      <button class="btn gold" id="mClaude">Open in Claude</button>
    </div>
    <div class="row">
      <button class="btn ghost" id="mJson">⬇ Export manifest (JSON)</button>
      <button class="btn ghost" id="mClose">Close</button>
    </div>`);
  document.getElementById('mCopy').onclick=async()=>{
    try{await navigator.clipboard.writeText(p);}catch(e){}
    document.getElementById('mCopy').textContent="✓ copied";};
  document.getElementById('mClaude').onclick=()=>
    window.open("https://claude.ai/new?q="+encodeURIComponent(p),"_blank","noopener");
  document.getElementById('mJson').onclick=()=>{
    const blob=new Blob([JSON.stringify(buildManifest(),null,2)],{type:"application/json"});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download="aab-manifest.json";a.click();};
  document.getElementById('mClose').onclick=closeModal;
}

/* ---- palette render ---- */
function renderPalette(){
  const box=document.getElementById('palette');box.innerHTML='';
  BRUSHES.forEach(b=>{const el=document.createElement('div');
    el.className='brush'+(brush===b.k?' on':'');
    el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="${b.hue}" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round">${b.ico}</svg>${b.name}`;
    el.onclick=()=>setBrush(b.k);box.appendChild(el);});
  // build button pinned at the bottom
  const build=document.createElement('div');build.className='brush';build.style.marginTop='auto';
  build.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="#4fd08a" stroke-width="1.8"><path d="M5 3l14 9-14 9z"/></svg>Build`;
  build.onclick=openBuild;box.appendChild(build);
}

/* ---- modal / toast / hint ---- */
function modal(html){document.getElementById('modalBox').innerHTML=html;
  document.getElementById('modal').classList.add('on');}
function closeModal(){document.getElementById('modal').classList.remove('on');}
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
let toastT;function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2400);}
function hint(m){document.getElementById('hintbar').textContent=m;}

/* ---- boot ---- */
renderPalette();refreshQuests();resize();
addEventListener('resize',resize);
if(!G.intent&&G.nodes.length===0)setTimeout(openIntent,400);   // first-run: start with intent
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
// expose a reset
window.aabReset=()=>{G=blank();nextId=1;save();draw();refreshQuests();renderPalette();hint("Fresh canvas.");};

/* ---- v2 wiring: paint modes + settings (buttons live in the header) ---- */
(function(){
  const b1=document.getElementById('btnOne'),b2=document.getElementById('btnStep'),bs=document.getElementById('btnSet');
  if(b1)b1.onclick=()=>window.AABv2&&window.AABv2.paintOneShot();
  if(b2)b2.onclick=()=>window.AABv2&&window.AABv2.paintStep();
  if(bs)bs.onclick=()=>window.AABv2&&window.AABv2.openSettings();
})();
