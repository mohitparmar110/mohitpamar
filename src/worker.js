// src/worker.js
import { handleAudit } from "./audit.js";
import { handleCreateOrder } from "./create-order.js";
import { handleVerifyRazorpay } from "./verify-razorpay.js";

const MEDIA_BASE = "https://media.mohitparmar.co.in";
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  Object.entries(corsHeaders()).forEach(([key, value]) => headers.set(key, value));
  return new Response(JSON.stringify(data), { ...init, headers });
}
function safeDecode(value){try{return decodeURIComponent(value)}catch{return value}}
function encodeKey(key){return key.split("/").map(part=>encodeURIComponent(part)).join("/")}
function extensionOf(key){const match=key.toLowerCase().match(/\.([a-z0-9]+)$/);return match?match[1]:""}
function stemOf(key){return key.replace(/\.[^.\/]+$/,'')}
function basenameOf(key){return safeDecode(key.split("/").pop()||key)}
function cleanTitle(value){return String(value||"").replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()}
function titleFor(object){const meta=object.customMetadata||{};return cleanTitle(meta.title||meta.name||meta.nameTag||meta.name_tag||meta["name-tag"]||meta.label||basenameOf(object.key))}
function mediaUrl(key){return `${MEDIA_BASE}/${encodeKey(key)}`}
function resolveMediaRef(value){if(!value)return null;if(/^https?:\/\//i.test(value))return value;return mediaUrl(String(value).replace(/^\/+/,''))}
function inferGroup(key,meta={}){const hint=`${meta.group||""} ${meta.category||""} ${meta.section||""} ${key}`.toLowerCase();if(/pmax|performance[ -]?max/.test(hint))return"pmax";if(/meta|social|instagram|facebook|paid[ -]?social/.test(hint))return"meta";return"banners"}
function inferFormat(meta={}){const explicit=String(meta.format||meta.orientation||"").toLowerCase();if(["wide","landscape"].includes(explicit))return"wide";if(["portrait","vertical"].includes(explicit))return"portrait";if(["square","compact"].includes(explicit))return"square";const width=Number(meta.width||0),height=Number(meta.height||0);if(width&&height){if(Math.abs(width-height)/Math.max(width,height)<.12)return"square";return width>height?"wide":"portrait"}return"wide"}
function uploadedIso(object){const value=object.uploaded;if(!value)return null;const date=value instanceof Date?value:new Date(value);return Number.isNaN(date.getTime())?null:date.toISOString()}

async function listPortfolioObjects(bucket){
  const objects=[];let cursor;
  do{
    const page=await bucket.list({cursor,limit:1000,include:["customMetadata"]});
    objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  return objects;
}

async function handleWorks(request,env){
  if(!env.PORTFOLIO_BUCKET)return json({error:"Portfolio media bucket is not configured",works:[]},{status:503});
  const objects=await listPortfolioObjects(env.PORTFOLIO_BUCKET);
  objects.sort((a,b)=>{const at=a.uploaded?new Date(a.uploaded).getTime():0,bt=b.uploaded?new Date(b.uploaded).getTime():0;return bt-at});
  const grouped=new Map(),seenContent=new Set();
  for(const object of objects){
    if(!object?.key||object.key.startsWith('.'))continue;
    const ext=extensionOf(object.key),isImage=IMAGE_EXTENSIONS.has(ext),isVideo=VIDEO_EXTENSIONS.has(ext);if(!isImage&&!isVideo)continue;
    const contentSignature=object.etag?`${isVideo?'video':'image'}:${object.etag}`:null;if(contentSignature&&seenContent.has(contentSignature))continue;if(contentSignature)seenContent.add(contentSignature);
    const stem=stemOf(object.key).toLowerCase(),item={key:object.key,title:titleFor(object),url:mediaUrl(object.key),uploaded:uploadedIso(object),size:object.size||0,etag:object.etag||null,type:isVideo?'video':'image',customMetadata:object.customMetadata||{}};
    const current=grouped.get(stem)||{image:null,video:null};if(isVideo&&!current.video)current.video=item;if(isImage&&!current.image)current.image=item;grouped.set(stem,current);
  }
  const works=[...grouped.entries()].map(([id,pair])=>{
    const primary=pair.video||pair.image,meta=primary.customMetadata||{},imageMeta=pair.image?.customMetadata||{};
    const uploaded=[pair.video?.uploaded,pair.image?.uploaded].filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0]||null;
    const poster=pair.image?.url||resolveMediaRef(meta.poster||meta.thumbnail||imageMeta.poster),width=Number(meta.width||imageMeta.width||0)||null,height=Number(meta.height||imageMeta.height||0)||null;
    return{id,key:primary.key,title:primary.title,type:pair.video?'video':'image',src:primary.url,poster,uploaded,group:inferGroup(primary.key,meta),format:inferFormat({...imageMeta,...meta,width,height}),width,height,client:meta.client||meta.brand||meta.project||null,discipline:meta.discipline||meta.role||meta.service||null,filename:basenameOf(primary.key)};
  }).sort((a,b)=>{const at=a.uploaded?new Date(a.uploaded).getTime():0,bt=b.uploaded?new Date(b.uploaded).getTime():0;return bt-at||a.title.localeCompare(b.title)});
  return json({generatedAt:new Date().toISOString(),works},{headers:{"Cache-Control":"public, max-age=120, stale-while-revalidate=3600"}});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="OPTIONS")return new Response(null,{headers:corsHeaders()});
    if(url.pathname==="/api/works"&&request.method==="GET"){
      try{
        const cache=caches.default;
        const cacheKey=new Request(url.origin+url.pathname,{method:"GET"});
        const cached=await cache.match(cacheKey);if(cached)return cached;
        const response=await handleWorks(request,env);ctx.waitUntil(cache.put(cacheKey,response.clone()));return response;
      }catch(error){console.error("portfolio works listing failed",error);return json({error:"Portfolio media listing failed",works:[]},{status:500})}
    }
    if(url.pathname==="/api/audit"&&request.method==="POST")return handleAudit(request,env);
    if(url.pathname==="/api/create-order"&&request.method==="POST")return handleCreateOrder(request,env);
    if(url.pathname==="/api/verify-razorpay"&&request.method==="POST")return handleVerifyRazorpay(request,env);
    return new Response("Not found",{status:404});
  }
};
export function corsHeaders(){return{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}}
