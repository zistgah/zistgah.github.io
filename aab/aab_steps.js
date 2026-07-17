"use strict";
/* AAB six-step painting engine — © 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8
   The human states intent; the AI paints. Each step has a context-rich prompt and a JSON
   schema. One-shot chains all six; stepwise runs one at a time for learning / optimisation. */

const AAB_RULES=[
 "Preserve the stated intent verbatim — never rewrite it.",
 "Implement only what is painted; ask before adding scope.",
 "Nothing is 'done' without a runnable oracle (a command/test returning pass/fail).",
 "Every element kind must be one of: actor, component, store, gate, interface, environment.",
 "© 1993–2026 Abhishek Choudhary · AyeAI. Software GPL-3.0-or-later."
];

/* context block prepended to every prompt so the AI paints inside AAB's vocabulary */
function ctx(G){
  return `You are the painting engine inside AAB (آب), a Verification-Gated (VGC) system-design
studio. A "system" is painted from six element kinds only:
  actor        — a person/role/external system that acts
  component    — a service/module/process that does work
  store        — a data store (db, file, queue, cache)
  gate         — a verification gate/oracle checkpoint
  interface    — an API/UI/contract surface
  environment  — a runtime/context boundary (browser, server, device, cloud)
Flows connect elements (from → to) and describe data/control movement.

SYSTEM INTENT (verbatim, never alter):
${G.intent||"(not yet stated)"}

RULES:
${AAB_RULES.map(r=>"- "+r).join("\n")}`;
}

/* the six steps. Each: id, title, schema, buildPrompt(G) -> string, apply(G,json) -> void */
const STEPS=[
 {id:"intent", title:"Intent", schema:null,
  // intent is human-authored, not AI-painted; this step just captures it
  human:true},

 {id:"elements", title:"Elements", schema:"elements",
  prompt:G=>`${ctx(G)}

TASK: Paint the ELEMENTS of this system. Return the minimal set that satisfies the intent —
typically 4–9 elements. Each needs: kind (one of the six), a short name, and a one-line intent.
Return ONLY JSON:
{"elements":[{"kind":"actor|component|store|gate|interface|environment","name":"...","intent":"..."}]}`,
  apply(G,j){
    const spread=layoutRing(j.elements.length);
    G.nodes=j.elements.map((e,i)=>({id:i+1,kind:e.kind,label:e.name,state:"named",
      note:e.intent||"",oracle:"",x:spread[i].x,y:spread[i].y}));
    G.nextId=G.nodes.length+1;
  }},

 {id:"flows", title:"Flows", schema:"flows",
  prompt:G=>`${ctx(G)}

ELEMENTS ALREADY PAINTED:
${G.nodes.map(n=>`- [${n.kind}] ${n.label}`).join("\n")}

TASK: Paint the FLOWS between these elements (data/control movement). Use the exact element
names above. Return ONLY JSON:
{"flows":[{"from":"<name>","to":"<name>","label":"<what moves>"}]}`,
  apply(G,j){
    const byName=n=>G.nodes.find(x=>x.label===n);
    G.edges=j.flows.map(f=>{const a=byName(f.from),b=byName(f.to);
      return a&&b?{a:a.id,b:b.id,label:f.label||""}:null;}).filter(Boolean);
  }},

 {id:"naming", title:"Naming", schema:"elements",
  prompt:G=>`${ctx(G)}

CURRENT ELEMENTS:
${G.nodes.map(n=>`- [${n.kind}] ${n.label} — ${n.note||"(no note)"}`).join("\n")}

TASK: Refine NAMES and one-line intents for clarity and convention (clear, specific, no jargon).
Keep the same kinds and count. Return ONLY JSON:
{"elements":[{"kind":"...","name":"...","intent":"..."}]}`,
  apply(G,j){
    j.elements.forEach((e,i)=>{if(G.nodes[i]){G.nodes[i].label=e.name;G.nodes[i].note=e.intent||G.nodes[i].note;}});
  }},

 {id:"gates", title:"Gates", schema:"elements",
  prompt:G=>`${ctx(G)}

CURRENT ELEMENTS:
${G.nodes.map(n=>`- [${n.kind}] ${n.label}`).join("\n")}

TASK: Ensure the system has VERIFICATION GATES. Return any gate elements to ADD (kind must be
"gate"), each with the oracle it enforces in its intent field. Return ONLY JSON:
{"elements":[{"kind":"gate","name":"...","intent":"oracle: <how it is checked>"}]}
If gates already suffice, return {"elements":[]}.`,
  apply(G,j){
    let id=G.nextId||(G.nodes.length+1);
    const spread=layoutRing(G.nodes.length+j.elements.length);
    j.elements.forEach(e=>{G.nodes.push({id:id,kind:"gate",label:e.name,state:"named",
      note:e.intent||"",oracle:(e.intent||"").replace(/^oracle:\s*/i,""),x:spread[id-1].x,y:spread[id-1].y});id++;});
    G.nextId=id;
  }},

 {id:"oracles", title:"Oracles", schema:"elements",
  prompt:G=>`${ctx(G)}

ELEMENTS:
${G.nodes.map(n=>`- [${n.kind}] ${n.label}`).join("\n")}

TASK: For EACH element, specify the concrete ORACLE that proves it works — a runnable command
or test that returns pass/fail (e.g. "pytest tests/x.py", "curl … | grep 200", "node test.js").
Return ONLY JSON (same order as above):
{"elements":[{"kind":"...","name":"<same>","intent":"<oracle command>"}]}`,
  apply(G,j){
    j.elements.forEach((e,i)=>{if(G.nodes[i])G.nodes[i].oracle=e.intent||G.nodes[i].oracle;});
  }}
];

/* simple ring auto-layout so painted nodes don't stack */
function layoutRing(n){
  const cx=190,cy=180,R=Math.min(130,60+n*10),out=[];
  for(let i=0;i<Math.max(n,1);i++){const a=(-90+i*360/Math.max(n,1))*Math.PI/180;
    out.push({x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)});}
  return out;
}

/* one-shot prompt: intent -> full system (elements+flows+oracles) in a single handoff */
function oneShotPrompt(G){
  return `${ctx(G)}

TASK: Paint the ENTIRE system in one pass — elements, flows, gates and each element's oracle.
Return ONLY JSON:
{
  "elements":[{"kind":"...","name":"...","intent":"...","oracle":"<runnable pass/fail command>"}],
  "flows":[{"from":"<name>","to":"<name>","label":"<what moves>"}]
}
Include at least one gate element. Keep it minimal but complete for the intent.`;
}
function applyOneShot(G,j){
  const spread=layoutRing(j.elements.length);
  G.nodes=j.elements.map((e,i)=>({id:i+1,kind:e.kind,label:e.name,state:"named",
    note:e.intent||"",oracle:e.oracle||"",x:spread[i].x,y:spread[i].y}));
  G.nextId=G.nodes.length+1;
  const byName=n=>G.nodes.find(x=>x.label===n);
  G.edges=(j.flows||[]).map(f=>{const a=byName(f.from),b=byName(f.to);
    return a&&b?{a:a.id,b:b.id,label:f.label||""}:null;}).filter(Boolean);
}

if(typeof module!=="undefined")module.exports={STEPS,oneShotPrompt,applyOneShot,ctx,AAB_RULES,layoutRing};

if(typeof window!=="undefined"){
  window.STEPS=STEPS;window.oneShotPrompt=oneShotPrompt;window.applyOneShot=applyOneShot;
  window.ctx=ctx;window.AAB_RULES=AAB_RULES;window.layoutRing=layoutRing;
}
