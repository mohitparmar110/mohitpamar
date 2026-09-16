const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu'}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close':'Menu'});
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});

const reduce=matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('.film-rail').forEach(rail=>{
 const arrows=[...document.querySelectorAll(`[data-direction][aria-controls="${rail.id}"]`)];
 function updateRail(){if(!arrows.length)return;arrows[0].disabled=rail.scrollLeft<2;arrows[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2}
 function step(direction){const card=rail.querySelector('.film-card');if(!card)return;rail.scrollBy({left:direction*(card.getBoundingClientRect().width+parseFloat(getComputedStyle(rail).gap)),behavior:reduce.matches?'instant':'smooth'})}
 arrows.forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.direction))));
 rail.addEventListener('scroll',updateRail,{passive:true});
 window.addEventListener('resize',updateRail);
 rail.addEventListener('keydown',e=>{if(e.target===rail&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});
 rail.addEventListener('wheel',e=>{
  if(rail.scrollWidth<=rail.clientWidth||Math.abs(e.deltaX)>=Math.abs(e.deltaY))return;
  const atStart=rail.scrollLeft<=1,atEnd=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-1;
  if((e.deltaY<0&&atStart)||(e.deltaY>0&&atEnd))return;
  e.preventDefault();rail.scrollLeft+=e.deltaY;
 },{passive:false});
 updateRail();
});

const portfolioPolish=document.createElement('style');
portfolioPolish.textContent=`
.creative-item .creative-media{display:block;position:relative;overflow:hidden;background:#e7e9e1}
.creative-item.is-long .creative-media{aspect-ratio:4/3}
.creative-item.is-long .creative-media img{width:100%;height:100%;object-fit:cover;object-position:top}
.creative-item .creative-kind{margin-top:5px;font-size:9px;line-height:1.35;letter-spacing:.08em;text-transform:uppercase;color:#7a8073}
#galleryMore{display:block;margin:12px auto 0;border:1px solid #aeb4a6;background:transparent;color:#283021;padding:11px 18px;border-radius:999px;font:inherit;font-size:11px;cursor:pointer}
#galleryMore[hidden]{display:none}
@media(max-width:600px){
 .film-rail{direction:ltr;margin-inline:calc(var(--pad)*-1);padding:5px var(--pad) 18px;scroll-padding-inline:var(--pad);scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 .film-rail::-webkit-scrollbar{display:none}
 .film-card{flex:0 0 min(84vw,360px);scroll-snap-stop:always}
 .reel-card{flex:0 0 min(68vw,290px)}
 .films .section-head,.reels .section-head{align-items:flex-start;margin-bottom:22px}
 .films .rail-tools,.reels .rail-tools{display:none}
 .rail-hint{font-size:9px;margin-top:8px}
 .website-preview,.website-project:first-child .website-preview{height:285px}
 .website-info{padding-top:14px;gap:12px}
 .website-info h3{font-size:21px}
 .creative-gallery{display:flex!important;columns:auto!important;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--pad);margin-inline:calc(var(--pad)*-1);padding:0 var(--pad) 14px;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 .creative-gallery::-webkit-scrollbar{display:none}
 .creative-item{flex:0 0 min(82vw,330px);margin:0!important;scroll-snap-align:start;scroll-snap-stop:always}
 .creative-item .creative-media{aspect-ratio:4/3}
 .creative-item:not(.is-long) .creative-media img{width:100%;height:100%;object-fit:contain}
 .creative-item figcaption{align-items:flex-start;gap:10px}
 #galleryMore{margin-top:16px}
}
`;
document.head.append(portfolioPolish);

function resetRail(rail){
 if(!rail)return;
 rail.setAttribute('dir','ltr');
 rail.scrollLeft=0;
 requestAnimationFrame(()=>{rail.scrollLeft=0});
 setTimeout(()=>{rail.scrollLeft=0},80);
}
function orderReelsNewestFirst(){
 const rail=document.querySelector('#reelRail');if(!rail)return;
 const cards=[...rail.querySelectorAll('.reel-card')];
 const reelNumber=card=>Number((card.querySelector('[data-film]')?.dataset.film||'').match(/(\d+)$/)?.[1]||0);
 cards.sort((a,b)=>reelNumber(b)-reelNumber(a)).forEach((card,index)=>{
  const number=card.querySelector('.film-number');if(number)number.textContent=String(index+1).padStart(2,'0');
  rail.append(card);
 });
 resetRail(rail);
}
orderReelsNewestFirst();
window.addEventListener('pageshow',()=>document.querySelectorAll('.film-rail').forEach(resetRail));

const dialog=document.querySelector('#player'),video=dialog.querySelector('video'),error=document.querySelector('#videoError');let opener;
document.addEventListener('click',e=>{const a=e.target.closest('[data-film]');if(!a)return;e.preventDefault();opener=a;document.querySelector('#playerTitle').textContent=a.dataset.title||'Film';error.hidden=true;error.querySelector('a').href=a.href;video.src=a.href;const image=a.querySelector('img'),preview=a.querySelector('video');video.poster=image?.currentSrc||image?.src||preview?.poster||'';dialog.showModal();video.play().catch(()=>{});});
video.addEventListener('error',()=>{error.hidden=false});document.querySelector('#closePlayer').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();opener?.focus()});

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const normalize=value=>String(value||'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const filmStopWords=new Set(['the','and','for','with','from','into','film','video','motion','commercial','campaign','stories','story','edit','creative','direction','advertising','portfolio','latest','product','cfs','choice','furniture','superstore']);
const filmTokens=value=>normalize(value).split(' ').filter(token=>token.length>=3&&!filmStopWords.has(token));
const sameFilm=(a,b)=>{const left=filmTokens(a),right=new Set(filmTokens(b));return left.some(token=>right.has(token))};
const blankPoster='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/%3E';
const workText=work=>normalize(`${work?.title||''} ${work?.filename||''} ${work?.key||''} ${work?.client||''} ${work?.discipline||''}`);
const isSofaWork=work=>/\bsofa\b|\bsettee\b/.test(workText(work));
const isBedWork=work=>/\bbed\b|\bbedroom\b|\bmattress\b/.test(workText(work));
const isSpaWork=work=>/\bspa\b|\bhammam\b|\bayu\b|\britual/.test(workText(work));
const rawTitleLooksBad=value=>/\b(page|image|img|screenshot|screen shot)\s*0*\d+\b|www\.|\.(com|co|in|ae|uk)\b|\(\d+\)|[_-]{2,}/i.test(String(value||''));
function displayTitle(work,fallback='Selected Motion'){
 if(isSofaWork(work))return 'Sofa Commercial';
 if(isBedWork(work))return 'The Bed Edit';
 if(isSpaWork(work))return 'Spa Reel';
 const title=String(work?.title||'').trim(),filename=String(work?.filename||work?.key||'').trim();
 if(!title||rawTitleLooksBad(title))return fallback;
 if(filename&&normalize(title)===normalize(filename))return fallback;
 return title;
}
function imageTitle(work){
 const text=workText(work),title=String(work?.title||'').trim(),filename=String(work?.filename||work?.key||'').trim();
 if(/prime trust|jp north|real estate|property/.test(text))return 'Prime Trust — Real Estate Website';
 if(/auraz/.test(text))return 'AuraZ — Brand & Campaign Creative';
 if(/urbandeco.*ae|urban deco.*ae/.test(text)){
  if(/instagram|social|feed|grid/.test(text))return 'Urban Deco UAE — Social Media Management';
  if(/pdp|product page|collection|homepage|website|web page/.test(text))return 'Urban Deco UAE — Ecommerce UX';
  return 'Urban Deco UAE — Campaign Creative';
 }
 if(/urbandeco.*uk|urban deco.*uk/.test(text)){
  if(/pdp|product page|collection|homepage|website|web page/.test(text))return 'Urban Deco UK — Ecommerce UX';
  return 'Urban Deco UK — Campaign Creative';
 }
 if(/choice|cfs|furniture superstore/.test(text)){
  if(/pdp|product page|collection|homepage|website|web page|living room/.test(text))return 'Choice Furniture — Ecommerce UX';
  return 'Choice Furniture — Campaign Creative';
 }
 if(/mohitparmarofficial|google ads|analytics|impressions|cpm|conversion|performance|max|pmax/.test(text))return 'Performance Marketing — Campaign Analytics';
 if(/instagram|social media|social|feed|grid/.test(text))return 'Social Media Management';
 if(/pdp|product page|collection page|homepage|website|web design/.test(text))return 'Ecommerce Website & PDP Design';
 if(/campaign|banner|sale|creative/.test(text))return 'Campaign Creative';
 if(title&&!rawTitleLooksBad(title)&&(!filename||normalize(title)!==normalize(filename)))return title;
 return 'Portfolio Creative';
}
function imageRole(work){
 const text=workText(work);
 if(/analytics|impressions|cpm|conversion|performance|max|pmax|google ads/.test(text))return 'PERFORMANCE MARKETING';
 if(/instagram|social|feed|grid/.test(text))return 'SOCIAL MEDIA MANAGEMENT';
 if(/pdp|product page|collection|homepage|website|web page|real estate/.test(text))return 'ECOMMERCE / WEB DESIGN';
 if(/auraz|campaign|banner|sale|creative/.test(text))return 'BRAND / CAMPAIGN';
 return 'CREATIVE DIRECTION';
}
function isLongPortfolioAsset(work){
 const width=Number(work?.width||0),height=Number(work?.height||0),text=workText(work);
 return (width&&height&&height/width>1.55)||/pdp|product page|collection|homepage|website|web page|instagram|social|feed|grid|analytics|page \d+|urbandeco|choice|cfs|prime trust|mohitparmarofficial/.test(text);
}

document.querySelectorAll('[data-collection]').forEach(button=>{
 if(button.dataset.collection==='banners')button.textContent='Campaign & Ecommerce';
 if(button.dataset.collection==='pmax')button.textContent='Performance Marketing';
 if(button.dataset.collection==='meta')button.textContent='Social Media & Brand';
});

const filmRail=document.querySelector('#filmRail');
const legacyFilms=[...filmRail.querySelectorAll('.film-card')].map(card=>{const a=card.querySelector('[data-film]'),img=a?.querySelector('img');return{title:a?.dataset.title||card.querySelector('h3')?.textContent||'Film',href:a?.href||'',poster:img?.getAttribute('src')||'',caption:card.querySelector('.film-caption p')?.textContent||'MOTION / PORTFOLIO'}});

let collection='banners',format='all',mediaType='all',galleryAssets=[],staticGalleryAssets=[],bucketWorks=[],galleryExpanded=false;
const gallery=document.querySelector('#creativeGallery');
const GALLERY_LIMIT=12;
let galleryMore=document.querySelector('#galleryMore');
if(!galleryMore){galleryMore=document.createElement('button');galleryMore.id='galleryMore';galleryMore.type='button';galleryMore.hidden=true;gallery.after(galleryMore)}
galleryMore.addEventListener('click',()=>{galleryExpanded=!galleryExpanded;renderGallery();gallery.scrollLeft=0});

function staticRole(item){if(item.group==='pmax')return 'PERFORMANCE CREATIVE';if(item.group==='meta')return 'PAID SOCIAL / BRAND';return 'CAMPAIGN DESIGN'}
function staticTitle(item){
 const title=String(item.title||'').trim();
 if(/choice furniture/i.test(title))return 'Choice Furniture — Campaign Creative';
 if(/urbandeco uk/i.test(title))return 'Urban Deco UK — Campaign Creative';
 if(/urbandeco\.?ae/i.test(title))return 'Urban Deco UAE — Campaign Creative';
 if(/auraz/i.test(title))return 'AuraZ — Brand Campaign';
 if(/apka jyotish/i.test(title))return 'Apka Jyotish — Digital Campaign';
 if(/performance campaign/i.test(title))return 'Performance Marketing Creative';
 if(/paid social creative/i.test(title))return 'Paid Social Creative';
 return title||'Campaign Creative';
}

function renderGallery(){
 gallery.querySelectorAll('[data-film]').forEach(a=>previewObserver.unobserve(a));
 const allSelected=galleryAssets.filter(a=>a.group===collection&&(format==='all'||a.format===format)&&(mediaType==='all'||(mediaType==='video'?!!a.video:!a.video)));
 const selected=galleryExpanded?allSelected:allSelected.slice(0,GALLERY_LIMIT);
 document.querySelector('#galleryCount').textContent=allSelected.length>selected.length?`${selected.length} curated previews of ${allSelected.length} · open any card for the full work`:`${allSelected.length} curated creative ${allSelected.length===1?'preview':'previews'}`;
 gallery.innerHTML=selected.map(a=>{
  const title=escapeHtml(a.title),link=escapeHtml(a.video||a.src),width=Number(a.width)||1600,height=Number(a.height)||900,role=escapeHtml(a.role||staticRole(a));
  const longClass=a.longForm||height/width>1.55?' is-long':'';
  const visual=a.src?`<img src="${escapeHtml(a.src)}" width="${width}" height="${height}" alt="${title} ${escapeHtml(a.format)} creative" loading="lazy">`:`<video muted loop playsinline preload="none" aria-hidden="true"></video>`;
  return`<figure class="creative-item${longClass}"><a class="creative-media" href="${link}" ${a.video?`data-film="gallery" data-title="${title}"`:'target="_blank" rel="noopener"'} aria-label="${a.video?'Play':'View'} ${title}">${visual}${a.video?'<span class="play">&#9654;</span>':''}</a><figcaption><div><h3>${title}</h3><p class="creative-kind">${role}</p></div><span>${a.video?'Play video':'View project'} &nearr;</span></figcaption></figure>`;
 }).join('')||'<p>No matching creative. Try All creative or All sizes.</p>';
 galleryMore.hidden=allSelected.length<=GALLERY_LIMIT;
 if(!galleryMore.hidden)galleryMore.textContent=galleryExpanded?'Show fewer':`Show ${allSelected.length-GALLERY_LIMIT} more`;
 autoplayPreviews(gallery);resetRail(gallery);
}
function resetGalleryFilters(){galleryExpanded=false}
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>{collection=b.dataset.collection;format='all';mediaType='all';resetGalleryFilters();document.querySelectorAll('[data-media]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.media==='all')));document.querySelectorAll('[data-collection]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.format==='all')));renderGallery()}));
document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{format=b.dataset.format;resetGalleryFilters();document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery()}));
document.querySelectorAll('[data-media]').forEach(b=>b.addEventListener('click',()=>{mediaType=b.dataset.media;resetGalleryFilters();document.querySelectorAll('[data-media]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery()}));

function galleryFromBucket(){
 return bucketWorks.filter(work=>work.type==='image').map(work=>({group:['banners','pmax','meta'].includes(work.group)?work.group:'banners',src:work.src,video:null,title:imageTitle(work),role:imageRole(work),longForm:isLongPortfolioAsset(work),format:['wide','square','portrait'].includes(work.format)?work.format:'wide',width:work.width||1600,height:work.height||900,uploaded:work.uploaded||''}));
}
function mergeGallery(){
 const seen=new Set(),merged=[];
 for(const source of [...galleryFromBucket(),...staticGalleryAssets]){
  const item={...source,title:source.role?source.title:staticTitle(source),role:source.role||staticRole(source)};
  const identity=normalize(item.video||item.src||`${item.title}-${item.format}`);
  if(!identity||seen.has(identity))continue;
  seen.add(identity);merged.push(item);
 }
 galleryAssets=merged;
}

function filmCard(work,index){
 const title=escapeHtml(displayTitle(work,'Selected Motion')),href=escapeHtml(work.src),poster=work.poster?escapeHtml(work.poster):blankPoster,caption=escapeHtml(work.discipline||work.client||'MOTION / PORTFOLIO');
 return`<article class="film-card"><a href="${href}" data-film="dynamic-${escapeHtml(work.id||index)}" data-title="${title}" aria-label="Play ${title}"><img src="${poster}" alt="${title} film still" loading="lazy" width="1280" height="720"><span class="film-number">${String(index+1).padStart(2,'0')}</span><span class="play">▶</span><span class="watch">Watch film ↗</span></a><div class="film-caption"><h3>${title}</h3><p>${caption}</p></div></article>`;
}
function legacyCard(item,index){
 return`<article class="film-card"><a href="${escapeHtml(item.href)}" data-film="legacy-${index}" data-title="${escapeHtml(item.title)}" aria-label="Play ${escapeHtml(item.title)}"><img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)} film still" loading="lazy" width="1280" height="720"><span class="film-number">${String(index+1).padStart(2,'0')}</span><span class="play">▶</span><span class="watch">Watch film ↗</span></a><div class="film-caption"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.caption)}</p></div></article>`;
}
function renderDynamicFilms(){
 const dynamic=bucketWorks.filter(work=>work.type==='video');
 if(!dynamic.length)return;
 filmRail.querySelectorAll('[data-film]').forEach(a=>previewObserver.unobserve(a));
 const remainingLegacy=legacyFilms.filter(item=>!dynamic.some(work=>sameFilm(item.title,work.title)||sameFilm(item.href.split('/').pop(),work.filename||work.title)));
 const dynamicSofa=dynamic.filter(isSofaWork),dynamicRest=dynamic.filter(work=>!isSofaWork(work));
 const legacySofa=dynamicSofa.length?[]:remainingLegacy.filter(item=>/sofa/i.test(`${item.title} ${item.href}`));
 const legacyRest=remainingLegacy.filter(item=>!legacySofa.includes(item));
 const blocks=[];dynamicSofa.forEach(work=>blocks.push({kind:'dynamic',work}));legacySofa.forEach(item=>blocks.push({kind:'legacy',item}));dynamicRest.forEach(work=>blocks.push({kind:'dynamic',work}));legacyRest.forEach(item=>blocks.push({kind:'legacy',item}));
 filmRail.innerHTML=blocks.map((entry,index)=>entry.kind==='dynamic'?filmCard(entry.work,index):legacyCard(entry.item,index)).join('');
 autoplayPreviews(filmRail);filmRail.dispatchEvent(new Event('scroll'));resetRail(filmRail);
}
function updateHero(){
 const hero=document.querySelector('.hero-visual');if(!hero)return;
 const sofa=bucketWorks.find(work=>work.type==='video'&&isSofaWork(work));if(!sofa)return;
 const titleText=displayTitle(sofa,'Sofa Commercial');hero.href=sofa.src;hero.dataset.title=titleText;
 const title=hero.querySelector('.visual-bottom h2'),client=hero.querySelector('.visual-bottom>span'),discipline=hero.querySelector('.visual-bottom p'),img=hero.querySelector('img'),preview=hero.querySelector('video');
 if(title)title.textContent=titleText;if(client)client.textContent=(sofa.client||'FEATURED COMMERCIAL').toUpperCase();if(discipline)discipline.textContent=sofa.discipline||'Creative direction · Motion · Commerce';if(img){if(sofa.poster)img.src=sofa.poster;img.alt=`${titleText} preview`}if(preview){preview.pause();preview.removeAttribute('src');preview.poster=sofa.poster||img?.src||'';preview.src=sofa.src;preview.load();if(!reduce.matches)preview.play().catch(()=>{})}
}

Promise.allSettled([fetch('/gallery.json').then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json()}),fetch('/api/works',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Works unavailable');return r.json()})]).then(([galleryResult,worksResult])=>{
 staticGalleryAssets=galleryResult.status==='fulfilled'?galleryResult.value:[];bucketWorks=worksResult.status==='fulfilled'&&Array.isArray(worksResult.value?.works)?worksResult.value.works:[];mergeGallery();renderGallery();if(bucketWorks.length){renderDynamicFilms();updateHero()}if(galleryResult.status==='rejected'&&!bucketWorks.length)document.querySelector('#galleryCount').textContent='The gallery could not load. Please refresh the page.';
});

const logoRow=document.querySelector('.logo-row'),pauseLogos=document.querySelector('.logo-pause');
let logosPaused=false,logosHover=false,logosVisible=false,logoTime=0,logoPosition=0;
const originals=[...logoRow.children];originals.forEach(img=>{const copy=img.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.alt='';copy.removeAttribute('title');logoRow.append(copy)});
pauseLogos.addEventListener('click',()=>{logosPaused=!logosPaused;pauseLogos.setAttribute('aria-pressed',String(logosPaused));pauseLogos.textContent=logosPaused?'Resume logos':'Pause logos'});logoRow.addEventListener('pointerenter',()=>logosHover=true);logoRow.addEventListener('pointerleave',()=>logosHover=false);new IntersectionObserver(entries=>{logosVisible=entries[0].isIntersecting}).observe(logoRow);
function moveLogos(time){const elapsed=Math.min(time-logoTime,50);logoTime=time;const focused=logoRow.contains(document.activeElement);if(logosVisible&&!logosPaused&&!logosHover&&!focused&&!reduce.matches&&!document.hidden){const gap=parseFloat(getComputedStyle(logoRow).gap);const distance=(logoRow.scrollWidth+gap)/2;logoPosition+=elapsed*.018;if(logoPosition>=distance)logoPosition-=distance;logoRow.scrollLeft=logoPosition}else logoPosition=logoRow.scrollLeft;requestAnimationFrame(moveLogos)}requestAnimationFrame(moveLogos);

const previewObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{const preview=target.querySelector('video');if(!preview)return;if(isIntersecting){if(!preview.src)preview.src=target.href;if(!reduce.matches)preview.play().catch(()=>{})}else preview.pause()}),{threshold:.1});
function autoplayPreviews(root=document){root.querySelectorAll('[data-film]').forEach(a=>{const existing=a.querySelector('video');if(existing){previewObserver.observe(a);return}const img=a.querySelector('img');if(!img)return;const preview=document.createElement('video');preview.autoplay=true;preview.muted=true;preview.defaultMuted=true;preview.loop=true;preview.playsInline=true;preview.preload='none';preview.poster=img.src;preview.setAttribute('aria-hidden','true');preview.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';preview.style.objectPosition=getComputedStyle(img).objectPosition;img.after(preview);previewObserver.observe(a)})}
autoplayPreviews();