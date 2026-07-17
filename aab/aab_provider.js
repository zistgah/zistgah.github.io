"use strict";
/* AAB AI-provider layer — © 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8
   One contract: provider.complete(prompt, schemaName) -> Promise<validated JSON>.
   Backends are a strategy, so internal API calls can be switched on later with a config
   flip and zero changes to the painting logic. */

/* ---- the JSON schemas the AI must satisfy, one per step ---- */
const KINDS=["actor","component","store","gate","interface","environment"];
const SCHEMAS={
  elements:{
    root:"elements",
    validate(o){
      if(!o||!Array.isArray(o.elements))return "expected { elements: [...] }";
      for(const e of o.elements){
        if(!KINDS.includes(e.kind))return `bad kind "${e.kind}" (allowed: ${KINDS.join(", ")})`;
        if(!e.name||typeof e.name!=="string")return "each element needs a string name";
      }
      return null;
    }
  },
  flows:{
    root:"flows",
    validate(o){
      if(!o||!Array.isArray(o.flows))return "expected { flows: [...] }";
      for(const f of o.flows){
        if(!f.from||!f.to)return "each flow needs from and to (element names)";
      }
      return null;
    }
  },
  full:{ // one-shot: intent already known, AI returns elements + flows together
    root:"system",
    validate(o){
      if(!o)return "empty";
      if(!Array.isArray(o.elements))return "expected elements[]";
      for(const e of o.elements){
        if(!KINDS.includes(e.kind))return `bad kind "${e.kind}"`;
        if(!e.name)return "element missing name";
      }
      if(o.flows&&!Array.isArray(o.flows))return "flows must be an array";
      return null;
    }
  }
};
function extractJSON(text){
  // tolerate ```json fences, prose around it, or a bare object
  if(typeof text!=="string")return text;
  let s=text.trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const a=s.indexOf("{"), b=s.lastIndexOf("}");
  if(a>=0&&b>a)s=s.slice(a,b+1);
  return JSON.parse(s);
}

/* ---- base contract ---- */
class AIProvider{
  get kind(){return "base";}
  get live(){return false;}                 // live = round-trips without user paste
  async complete(prompt, schemaName){throw new Error("not implemented");}
  parseAndValidate(text, schemaName){
    const obj=extractJSON(text);
    const sch=SCHEMAS[schemaName];
    const err=sch?sch.validate(obj):null;
    if(err)throw new Error("schema ("+schemaName+"): "+err);
    return obj;
  }
}

/* ---- 1. Manual (default, keyless): prompt out, JSON pasted back ---- */
class ManualProvider extends AIProvider{
  get kind(){return "manual";}
  async complete(prompt, schemaName){
    // resolved by the UI: it shows the prompt, collects a paste, calls parseAndValidate.
    return {mode:"manual", prompt, schemaName};
  }
}

/* ---- 2. Key (opt-in): user's own API key, live call ---- */
class KeyProvider extends AIProvider{
  constructor(key, model){super();this.key=key;this.model=model||"claude-sonnet-4-6";}
  get kind(){return "key";}
  get live(){return true;}
  async complete(prompt, schemaName){
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"content-type":"application/json","x-api-key":this.key,
        "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:this.model,max_tokens:2000,
        messages:[{role:"user",content:prompt+"\n\nReturn ONLY valid JSON, no prose, no code fences."}]})
    });
    if(!res.ok)throw new Error("API "+res.status);
    const data=await res.json();
    const text=(data.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n");
    return this.parseAndValidate(text, schemaName);
  }
}

/* ---- 3. Hosted (future internal calls): flip config when users justify it ---- */
class HostedProvider extends AIProvider{
  constructor(endpoint){super();this.endpoint=endpoint;}
  get kind(){return "hosted";}
  get live(){return true;}
  async complete(prompt, schemaName){
    const res=await fetch(this.endpoint,{method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({prompt, schema:schemaName})});
    if(!res.ok)throw new Error("hosted "+res.status);
    const data=await res.json();
    return this.parseAndValidate(data.text||JSON.stringify(data), schemaName);
  }
}

/* ---- factory: config decides the backend; the studio never hard-codes one ---- */
const AAB_CONFIG={
  provider:"manual",                     // "manual" | "key" | "hosted"
  hostedEndpoint:"",                     // set when HostedProvider is enabled
  model:"claude-sonnet-4-6"
};
function makeProvider(cfg, key){
  cfg=cfg||AAB_CONFIG;
  if(cfg.provider==="key"&&key)return new KeyProvider(key, cfg.model);
  if(cfg.provider==="hosted"&&cfg.hostedEndpoint)return new HostedProvider(cfg.hostedEndpoint);
  return new ManualProvider();
}
if(typeof module!=="undefined")module.exports={AIProvider,ManualProvider,KeyProvider,HostedProvider,
  makeProvider,SCHEMAS,extractJSON,KINDS,AAB_CONFIG};

/* ---- browser: publish the API as globals so other <script> blocks can see it ---- */
if(typeof window!=="undefined"){
  window.AIProvider=AIProvider;window.ManualProvider=ManualProvider;
  window.KeyProvider=KeyProvider;window.HostedProvider=HostedProvider;
  window.makeProvider=makeProvider;window.SCHEMAS=SCHEMAS;window.extractJSON=extractJSON;
  window.KINDS=KINDS;window.AAB_CONFIG=AAB_CONFIG;
}
