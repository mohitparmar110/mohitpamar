const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu'}
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close':'Menu'});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus()}});

const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width: 600px)');
const saveData=!!navigator.connection?.saveData;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value||'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,' ').trim();

const redesign=document.createElement('style');
redesign.textContent=`
/* 2026 portfolio presentation — curated, mobile-first */
.collection-tabs,.media-tabs,.format-tabs,#galleryCount,#creativeGallery,#galleryMore{display:none!important}
.section{content-visibility:auto;contain-intrinsic-size:800px}
.hero{content-visibility:visible}
.images{background:#f4f4ef!important;color:#171b16;padding-top:72px!important;padding-bottom:72px!important}
.images .section-head{justify-content:flex-start!important;text-align:left!important;max-width:920px;margin:0 0 42px!important}
.images .section-head h2{font-size:clamp(38px,5vw,72px)!important;max-width:760px}
.images .section-head .eyebrow{color:#697064!important}
.portfolio-groups{display:grid;gap:78px}
.portfolio-block{border-top:1px solid #cfd3c8;padding-top:28px}
.portfolio-block-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.7fr);gap:32px;align-items:end;margin-bottom:28px}
.portfolio-block-head h3{font-size:clamp(28px,3vw,44px);letter-spacing:-.045em;color:#171b16}
.portfolio-block-head p{font-size:13px;line-height:1.65;color:#697064;max-width:520px;justify-self:end}
.portfolio-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 20px}
.portfolio-card{min-width:0}
.portfolio-card-media{display:block;position:relative;aspect-ratio:4/3;overflow:hidden;background:#e1e3dc;border-radius:8px}
.portfolio-card-media img{width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .28s ease}
.portfolio-card.is-profile .portfolio-card-media{aspect-ratio:4/5}
.portfolio-card.is-profile .portfolio-card-media img,.portfolio-card.is-long .portfolio-card-media img{object-position:top}
.portfolio-card:hover .portfolio-card-media img{transform:scale(1.02)}
.portfolio-card-meta{display:flex;justify-content:space-between;gap:18px;padding-top:14px;align-items:flex-start}
.portfolio-card-meta h4{font-size:16px;line-height:1.3;letter-spacing:-.025em;color:#171b16;margin:0}
.portfolio-card-meta p{margin:6px 0 0;font-size:9px;line-height:1.45;letter-spacing:.09em;text-transform:uppercase;color:#777d72}
.portfolio-card-meta>a,.portfolio-card-meta>span{flex:0 0 auto;font-size:10px;color:#737a6f;padding-top:2px}
.portfolio-card .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#111b}
.portfolio-note{margin-top:18px;font-size:11px;color:#747b70}
/* Websites become previews, not full-page dumps */
.work{padding-top:72px!important;padding-bottom:72px!important}
.work .section-head{align-items:end}
.website-showcase{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:34px 22px!important}
.website-project:first-child{grid-column:auto!important}
.website-preview,.website-project:first-child .website-preview{height:auto!important;aspect-ratio:16/10;overflow:hidden!important;border-radius:8px!important;scrollbar-width:none!important}
.website-preview img,.website-project:first-child .website-preview img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:top!important}
.website-info{padding-top:14px!important;display:block!important}
.website-info h3{font-size:20px!important}
.website-info p{font-size:11px!important}
.page-links{margin-top:12px;max-width:none!important}
/* Keep films intentional */
.film-card .film-caption h3{overflow-wrap:anywhere}
.film-card[data-hidden-film='true']{display:none}
@media(max-width:900px){
 .portfolio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 .website-showcase{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:600px){
 header{position:sticky!important;top:0;z-index:40;background:#101110eF;backdrop-filter:blur(14px);margin:0!important;padding:0 20px!important}
 .hero{padding-top:30px!important}
 .hero-text{text-align:left!important;margin:0!important}
 .hero .actions{justify-content:flex-start!important}
 .hero-visual{height:300px!important;border-radius:8px!important}
 .hero-index{gap:16px}
 .section{padding-left:20px!important;padding-right:20px!important}
 .film-rail{direction:ltr;margin-inline:-20px!important;padding:5px 20px 18px!important;scroll-padding-inline:20px;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 .film-rail::-webkit-scrollbar{display:none}
 .film-card{flex:0 0 84vw!important;scroll-snap-stop:always}
 .reel-card{flex:0 0 68vw!important}
 .films .rail-tools,.reels .rail-tools{display:none!important}
 .films .section-head,.reels .section-head{margin-bottom:22px!important}
 .images{padding-top:58px!important;padding-bottom:58px!important}
 .images .section-head{margin-bottom:32px!important}
 .images .section-head h2{font-size:42px!important;line-height:1.02}
 .portfolio-groups{gap:58px}
 .portfolio-block{padding-top:22px}
 .portfolio-block-head{grid-template-columns:1fr;gap:10px;margin-bottom:20px}
 .portfolio-block-head h3{font-size:30px}
 .portfolio-block-head p{justify-self:start;font-size:12px;max-width:330px}
 .portfolio-grid{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:20px;margin-inline:-20px;padding:0 20px 12px;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 .portfolio-grid::-webkit-scrollbar{display:none}
 .portfolio-card{flex:0 0 82vw;scroll-snap-align:start;scroll-snap-stop:always}
 .portfolio-card.is-profile{flex-basis:72vw}
 .portfolio-card-meta h4{font-size:17px}
 .work{padding-top:58px!important;padding-bottom:58px!important}
 .work .section-head h2{font-size:40px!important;line-height:1.05}
 .website-showcase{display:flex!important;gap:14px!important;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:20px;margin-inline:-20px;padding:0 20px 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
 .website-showcase::-webkit-scrollbar{display:none}
 .website-project{flex:0 0 84vw;scroll-snap-align:start;scroll-snap-stop:always}
 .website-preview,.website-project:first-child .website-preview{aspect-ratio:16/10!important}
 .website-info h3{font-size:20px!important}
 .page-links{display:none!important}
 .clients,.about,.services,.credentials,.contact{content-visibility:auto;contain-intrinsic-size:600px}
}
`;
document.head.append(redesign);

function resetRail(rail){if(!rail)return;rail.setAttribute('dir','ltr');rail.scrollLeft=0;requestAnimationFrame(()=>rail.scrollLeft=0)}
function setupRail(rail){
 if(!rail)return;
 const arrows=[...document.querySelectorAll(`[data-direction][aria-controls="${rail.id}"]`)];
 const update=()=>{if(!arrows.length)return;arrows[0].disabled=rail.scrollLeft<2;arrows[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2};
 const step=direction=>{const card=rail.querySelector('.film-card');if(!card)return;const gap=parseFloat(getComputedStyle(rail).gap)||0;rail.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:reduce.matches?'auto':'smooth'})};
 arrows.forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.direction))));
 rail.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();resetRail(rail);
}
document.querySelectorAll('.film-rail').forEach(setupRail);

function orderReels(){
 const rail=document.querySelector('#reelRail');if(!rail)return;
 const cards=[...rail.querySelectorAll('.reel-card')];
 const n=card=>Number((card.querySelector('[data-film]')?.dataset.film||'').match(/(\d+)$/)?.[1]||0);
 cards.sort((a,b)=>n(b)-n(a)).forEach((card,index)=>{const badge=card.querySelector('.film-number');if(badge)badge.textContent=String(index+1).padStart(2,'0');rail.append(card)});
 resetRail(rail);
}
orderReels();
window.addEventListener('pageshow',()=>document.querySelectorAll('.film-rail').forEach(resetRail));

// Clean the intentionally curated Films section. R2 uploads never dump into this rail.
const filmRail=document.querySelector('#filmRail');
if(filmRail){
 const sofa=filmRail.querySelector('[data-film="sofa"]');
 if(sofa){sofa.dataset.title='Sofa Commercial';sofa.setAttribute('aria-label','Play Sofa Commercial');sofa.closest('.film-card')?.querySelector('h3')?.replaceChildren('Sofa Commercial')}
 [...filmRail.querySelectorAll('.film-number')].forEach((el,i)=>el.textContent=String(i+1).padStart(2,'0'));
 resetRail(filmRail);
}
const hero=document.querySelector('.hero-visual');
if(hero){hero.dataset.title='Sofa Commercial';hero.querySelector('.visual-bottom h2')?.replaceChildren('Sofa Commercial')}
const workHeading=document.querySelector('#work h2');if(workHeading)workHeading.textContent='Ecommerce & web.';
const imageHeading=document.querySelector('#images h2');if(imageHeading)imageHeading.textContent='Selected creative work.';
const imageEyebrow=document.querySelector('#images .eyebrow');if(imageEyebrow)imageEyebrow.textContent='CAMPAIGNS · PERFORMANCE · SOCIAL';
const imageNav=[...document.querySelectorAll('#nav a')].find(a=>a.getAttribute('href')==='#images');if(imageNav)imageNav.textContent='Creative work';

// Player — videos only load when requested on mobile.
const dialog=document.querySelector('#player'),player=dialog?.querySelector('video'),error=document.querySelector('#videoError');let opener;
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-film]');if(!a||!dialog||!player)return;e.preventDefault();opener=a;
 document.querySelector('#playerTitle').textContent=a.dataset.title||'Film';error.hidden=true;error.querySelector('a').href=a.href;
 player.src=a.href;const image=a.querySelector('img'),preview=a.querySelector('video');player.poster=image?.currentSrc||image?.src||preview?.poster||'';dialog.showModal();player.play().catch(()=>{});
});
player?.addEventListener('error',()=>{error.hidden=false});
document.querySelector('#closePlayer')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
dialog?.addEventListener('close',()=>{player.pause();player.removeAttribute('src');player.load();opener?.focus()});

let staticGallery=[],bucketWorks=[];
const preferredCampaign=['/assets/gallery-banners-3.webp','/assets/gallery-banners-18.webp','/assets/gallery-banners-27.webp','/assets/gallery-banners-7.webp','/assets/gallery-banners-1.webp','/assets/gallery-banners-16.webp'];

const rawWorkText=work=>`${work?.title||''} ${work?.filename||''} ${work?.key||''} ${work?.client||''} ${work?.discipline||''}`;
const workText=work=>normalize(rawWorkText(work));
const isImage=work=>work?.type==='image';
const isAuraZ=work=>/\bauraz\b/.test(workText(work));
const isPerformance=work=>/mohitparmarofficial|google ads|analytics|impressions|cpm|conversion|performance|max|pmax|campaign dashboard|ads manager/.test(workText(work));
function isSocialProfile(work){
 const raw=rawWorkText(work).trim();const text=workText(work);const title=String(work?.title||'').trim();
 if(/instagram|profile|feed|social media|grid|social management/i.test(raw))return true;
 if(/^urbandeco\.ae\d*$/i.test(title)||/^urbandeco ae\d*$/.test(normalize(title)))return true;
 return /urban deco ae\d*$/.test(text)&&!/banner|sale|campaign|pdp|homepage|website|product page/.test(text);
}
const uniqueBySrc=items=>{const seen=new Set();return items.filter(item=>{const key=item.src||item.video||item.url;if(!key||seen.has(key))return false;seen.add(key);return true})};

function staticAsset(item,title,role){return{src:item.src,video:item.video||null,title,role,format:item.format||'wide',profile:false,long:false}}
function campaignStatic(){
 const bySrc=new Map(staticGallery.map(x=>[x.src,x]));
 const titles={
  '/assets/gallery-banners-3.webp':'AuraZ — Festive Campaign',
  '/assets/gallery-banners-18.webp':'Urban Deco UK — Campaign System',
  '/assets/gallery-banners-27.webp':'Urban Deco UAE — Ecommerce Campaign',
  '/assets/gallery-banners-7.webp':'Choice Furniture — Motion Banner',
  '/assets/gallery-banners-1.webp':'Apka Jyotish — Digital Campaign',
  '/assets/gallery-banners-16.webp':'Felonic — Brand Creative'
 };
 return preferredCampaign.map(src=>bySrc.get(src)).filter(Boolean).map(item=>staticAsset(item,titles[item.src]||'Campaign Creative','CAMPAIGN / ECOMMERCE'));
}
function performanceStatic(){
 const items=staticGallery.filter(x=>x.group==='pmax').slice(0,3);
 const names=['Performance Max — Creative System','Paid Media — Asset Testing','Performance Campaign — Creative Variants'];
 return items.map((item,i)=>staticAsset(item,names[i]||'Performance Marketing','PERFORMANCE MARKETING'));
}
function auraDynamic(){
 return bucketWorks.filter(w=>isImage(w)&&isAuraZ(w)&&!isSocialProfile(w)).slice(0,2).map((w,i)=>({src:w.src,title:i===0?'AuraZ — Current Brand Campaign':'AuraZ — Ecommerce Creative',role:'BRAND / ECOMMERCE',format:w.format||'wide',long:false}));
}
function performanceDynamic(){
 const names=['Google Ads — Campaign Performance','Performance Marketing — Reporting & Optimisation','Paid Media — Campaign Analysis'];
 return bucketWorks.filter(w=>isImage(w)&&isPerformance(w)).slice(0,3).map((w,i)=>({src:w.src,title:names[i]||'Performance Marketing',role:'ADS / ANALYTICS',format:w.format||'wide',long:true}));
}
function socialProfiles(){
 const names=['Urban Deco UAE — Instagram Profile','Urban Deco UAE — Feed Direction','Urban Deco UAE — Social Content System','Urban Deco UAE — Reels & Grid'];
 return bucketWorks.filter(w=>isImage(w)&&isSocialProfile(w)&&!isPerformance(w)).slice(0,4).map((w,i)=>({src:w.src,title:names[i]||'Social Media Management',role:'SOCIAL MEDIA MANAGEMENT',format:w.format||'portrait',profile:true,long:true}));
}
function cardMarkup(item){
 const title=escapeHtml(item.title),role=escapeHtml(item.role||'CREATIVE DIRECTION'),src=escapeHtml(item.src),video=item.video?escapeHtml(item.video):null;
 const cls=`portfolio-card${item.profile?' is-profile':''}${item.long?' is-long':''}`;
 const link=video||src;
 return`<article class="${cls}"><a class="portfolio-card-media" href="${link}" ${video?`data-film="portfolio" data-title="${title}"`:'target="_blank" rel="noopener"'} aria-label="${video?'Play':'View'} ${title}"><img src="${src}" alt="${title}" loading="lazy" decoding="async">${video?'<span class="play">▶</span>':''}</a><div class="portfolio-card-meta"><div><h4>${title}</h4><p>${role}</p></div><span>${video?'Play':'View'} ↗</span></div></article>`;
}
function blockMarkup(id,eyebrow,title,copy,items){
 if(!items.length)return'';
 return`<section class="portfolio-block" id="${id}"><div class="portfolio-block-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h3>${escapeHtml(title)}</h3></div><p>${escapeHtml(copy)}</p></div><div class="portfolio-grid">${items.map(cardMarkup).join('')}</div></section>`;
}
function renderPortfolio(){
 const host=document.querySelector('#images');if(!host)return;
 let groups=host.querySelector('.portfolio-groups');if(!groups){groups=document.createElement('div');groups.className='portfolio-groups';host.querySelector('.section-head')?.after(groups)}
 const campaign=uniqueBySrc([...auraDynamic(),...campaignStatic()]).slice(0,6);
 const performance=uniqueBySrc([...performanceDynamic(),...performanceStatic()]).slice(0,5);
 const social=uniqueBySrc(socialProfiles()).slice(0,4);
 groups.innerHTML=
  blockMarkup('campaign-work','CAMPAIGN CREATIVE','Campaign & ecommerce','Selected launch creative, ecommerce campaigns and motion assets — only the work worth stopping for.',campaign)+
  blockMarkup('performance-work','PERFORMANCE MARKETING','Paid media & performance','Campaign reporting, ad systems and performance creative showing the commercial side of the work.',performance)+
  blockMarkup('social-management','SOCIAL MEDIA MANAGEMENT','Profiles, feeds & content systems','Instagram profile direction, feed management and social content systems. This section is management work — not a dump of ad creatives.',social);
 groups.querySelectorAll('.portfolio-grid').forEach(resetRail);
}

// Static campaign work paints first; R2 enriches only the small curated sections afterwards.
fetch('/gallery.json').then(r=>r.ok?r.json():[]).then(data=>{staticGallery=Array.isArray(data)?data:[];renderPortfolio()}).catch(()=>renderPortfolio());
fetch('/api/works').then(r=>r.ok?r.json():{works:[]}).then(data=>{bucketWorks=Array.isArray(data?.works)?data.works:[];renderPortfolio()}).catch(()=>{});

// Mobile stays poster-first. Desktop can autoplay only visible portfolio videos.
const previewObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{const preview=target.querySelector('video');if(!preview)return;if(isIntersecting){if(!preview.src)preview.src=target.href;preview.play().catch(()=>{})}else preview.pause()}),{threshold:.2});
function autoplayPreviews(root=document){
 if(mobile.matches||saveData||reduce.matches)return;
 root.querySelectorAll('[data-film]').forEach(a=>{
  if(a.closest('.reel-rail'))return;
  const img=a.querySelector('img');if(!img||a.querySelector('video'))return;
  const preview=document.createElement('video');preview.autoplay=true;preview.muted=true;preview.defaultMuted=true;preview.loop=true;preview.playsInline=true;preview.preload='none';preview.poster=img.src;preview.setAttribute('aria-hidden','true');preview.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';img.after(preview);previewObserver.observe(a);
 });
}
autoplayPreviews(document.querySelector('.hero')||document);
autoplayPreviews(filmRail||document);

// Clients move only on larger screens; on mobile they remain swipeable and still.
const logoRow=document.querySelector('.logo-row'),pauseLogos=document.querySelector('.logo-pause');
let logosPaused=false,logosHover=false,logosVisible=false,logoTime=0,logoPosition=0;
if(logoRow&&pauseLogos){
 const originals=[...logoRow.children];originals.forEach(img=>{const copy=img.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.alt='';copy.removeAttribute('title');logoRow.append(copy)});
 pauseLogos.addEventListener('click',()=>{logosPaused=!logosPaused;pauseLogos.setAttribute('aria-pressed',String(logosPaused));pauseLogos.textContent=logosPaused?'Resume logos':'Pause logos'});
 logoRow.addEventListener('pointerenter',()=>logosHover=true);logoRow.addEventListener('pointerleave',()=>logosHover=false);
 new IntersectionObserver(entries=>{logosVisible=entries[0].isIntersecting}).observe(logoRow);
 function moveLogos(time){const elapsed=Math.min(time-logoTime,50);logoTime=time;const focused=logoRow.contains(document.activeElement);if(!mobile.matches&&logosVisible&&!logosPaused&&!logosHover&&!focused&&!reduce.matches&&!document.hidden){const gap=parseFloat(getComputedStyle(logoRow).gap)||0;const distance=(logoRow.scrollWidth+gap)/2;logoPosition+=elapsed*.018;if(logoPosition>=distance)logoPosition-=distance;logoRow.scrollLeft=logoPosition}else logoPosition=logoRow.scrollLeft;requestAnimationFrame(moveLogos)}requestAnimationFrame(moveLogos);
}
