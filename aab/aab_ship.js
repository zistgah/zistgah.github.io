"use strict";
/* AAB build/validate + ship layer — © 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8
   Q6 Build&Validate: JS/browser systems RUN in a sandboxed iframe (pass/fail vs oracle);
   non-browser targets generate build+oracle commands and record the pasted result.
   Q7 Provenance: GitHub compose-URL seeding (keyless), browser OTS, Zenodo token-or-tools. */

/* ---- detect whether a system is runnable in the studio ---- */
function isBrowserRunnable(G){
  const envs=G.nodes.filter(n=>n.kind==="environment").map(n=>(n.label+" "+n.note).toLowerCase());
  const anyBrowser=envs.some(e=>/browser|web|dom|client|js|javascript|html/.test(e));
  const anyServer =envs.some(e=>/server|python|node backend|docker|cloud|device|native|c\+\+|rust/.test(e));
  if(anyBrowser&&!anyServer)return true;
  if(!envs.length)return null;   // unknown — let the user choose
  return anyServer?false:anyBrowser;
}

/* ---- JS-in-studio: run user code + oracle in a sandboxed iframe, capture pass/fail ---- */
function runInSandbox(code, oracle, timeoutMs){
  return new Promise((resolve)=>{
    timeoutMs=timeoutMs||4000;
    const iframe=document.createElement('iframe');
    iframe.sandbox="allow-scripts";
    iframe.style.display="none";
    let done=false;
    const finish=(r)=>{if(done)return;done=true;clearTimeout(to);
      window.removeEventListener('message',onMsg);iframe.remove();resolve(r);};
    const onMsg=(ev)=>{if(ev.data&&ev.data.__aab)finish(ev.data);};
    window.addEventListener('message',onMsg);
    const to=setTimeout(()=>finish({__aab:true,pass:false,log:"timed out ("+timeoutMs+"ms)"}),timeoutMs);
    // the harness: run the system code, then the oracle; oracle throws or returns false = fail
    const harness=`<!doctype html><script>
      (function(){
        var log=[]; var _c=console.log; console.log=function(){log.push([].join.call(arguments,' '));};
        var pass=false, err=null;
        try{
          ${code}
          ;var __r=(function(){ ${oracle} })();
          pass=(__r===undefined)?true:!!__r;
        }catch(e){err=String(e&&e.stack||e);pass=false;}
        parent.postMessage({__aab:true,pass:pass,log:log.join("\\n"),err:err},"*");
      })();
    <\/script>`;
    iframe.srcdoc=harness;
    document.body.appendChild(iframe);
  });
}

/* ---- non-browser: emit the build + oracle commands to run externally, record result ---- */
function externalRunbook(G){
  const gates=G.nodes.filter(n=>n.kind==="gate"||n.oracle);
  return `# AAB build & validate — external runbook
# © 1993–2026 Abhishek Choudhary · AyeAI
# System: ${(G.intent||"").slice(0,80)}
set -euo pipefail

# 1. scaffold (the AI's build plan produces the files; place them here)
# 2. run each element's oracle; every one must return pass:
${gates.map(n=>`echo "== oracle: ${n.label} =="\n${n.oracle||"# (no oracle recorded — add one)"}`).join("\n")}

echo "ALL ORACLES PASSED"   # only if every command above exited 0`;
}

/* ---- GitHub compose-URL seeding (Option B — keyless, click-to-commit) ---- */
function composeURL(owner, repo, branch, filename, content){
  // github.com/OWNER/REPO/new/BRANCH?filename=…&value=…  — pre-fills the new-file editor
  const base=`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/new/${encodeURIComponent(branch||"main")}`;
  return `${base}?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(content)}`;
}
function seedFiles(owner, repo, branch, files){
  // returns [{filename, url}] — the UI opens each; GitHub's editor value length is URL-bounded,
  // so large files are flagged for manual paste.
  return files.map(f=>{
    const url=composeURL(owner,repo,branch,f.filename,f.content);
    return {filename:f.filename, url, tooLong:url.length>7000};
  });
}

/* ---- browser OTS: SHA-256 the artifact, stamp via an OTS calendar, hand back the proof ---- */
async function sha256Hex(text){
  const buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function otsStamp(text, calendarUrl){
  // OpenTimestamps calendar submit: POST the 32-byte digest, receive a partial timestamp.
  // Default calendar is https://a.pool.opentimestamps.org (user-overridable).
  const hashHex=await sha256Hex(text);
  const digest=new Uint8Array(hashHex.match(/../g).map(h=>parseInt(h,16)));
  const cal=(calendarUrl||"https://a.pool.opentimestamps.org")+"/digest";
  try{
    const res=await fetch(cal,{method:"POST",
      headers:{"content-type":"application/octet-stream","accept":"application/octet-stream"},
      body:digest});
    if(!res.ok)throw new Error("calendar "+res.status);
    const proof=new Uint8Array(await res.arrayBuffer());
    return {ok:true, sha256:hashHex, calendar:cal, proofBytes:proof,
      note:"Partial OTS timestamp received. Save the .ots and upgrade later with the OpenTimestamps client for full Bitcoin attestation."};
  }catch(e){
    // honest failure: still give them the hash so they can stamp with the CLI
    return {ok:false, sha256:hashHex, error:String(e),
      note:"Calendar unreachable from the browser (CORS/network). The SHA-256 is valid — stamp it with: `ots stamp` on a file containing this hash, or retry."};
  }
}

/* ---- Zenodo: token path or point to the developed tools ---- */
function zenodoGuidance(hasToken){
  if(hasToken)return {mode:"token",
    steps:["Studio will POST a new deposition to https://zenodo.org/api/deposit/depositions",
           "Attach the exported manifest + README",
           "You review and publish on Zenodo (the studio never publishes for you)."]};
  return {mode:"tools",
    steps:["Install misty-doi:  pip install misty-doi",
           "Dry-run first:      misty publish --dry-run  (dry-run is the default)",
           "Then mint:          misty publish   (your ZENODO_TOKEN, your hands)",
           "misty-doi handles concept/version DOIs + OpenTimestamps sealing.",
           "Docs: project-ilm/misty-doi · doi:10.5281/zenodo.20719388"]};
}

if(typeof module!=="undefined")module.exports={isBrowserRunnable,runInSandbox,externalRunbook,
  composeURL,seedFiles,sha256Hex,otsStamp,zenodoGuidance};

if(typeof window!=="undefined"){
  window.isBrowserRunnable=isBrowserRunnable;window.runInSandbox=runInSandbox;
  window.externalRunbook=externalRunbook;window.composeURL=composeURL;window.seedFiles=seedFiles;
  window.sha256Hex=sha256Hex;window.otsStamp=otsStamp;window.zenodoGuidance=zenodoGuidance;
}
