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
 arrows.forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.direction))));rail.addEventListener('scroll',updateRail,{passive:true});window.addEventListener('resize',updateRail);rail.addEventListener('keydown',e=>{if(e.target===rail&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});updateRail();
});

const dialog=document.querySelector('#player'),video=dialog.querySelector('video'),error=document.querySelector('#videoError');let opener;
document.addEventListener('click',e=>{const a=e.target.closest('[data-film]');if(!a)return;e.preventDefault();opener=a;document.querySelector('#playerTitle').textContent=a.dataset.title||'Film';error.hidden=true;error.querySelector('a').href=a.href;video.src=a.href;const image=a.querySelector('img'),preview=a.querySelector('video');video.poster=image?.currentSrc||image?.src||preview?.poster||'';dialog.showModal();video.play().catch(()=>{});});
video.addEventListener('error',()=>{error.hidden=false});document.querySelector('#closePlayer').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();opener?.focus()});

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value||'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const filmStopWords=new Set(['the','and','for','with','from','into','film','video','motion','commercial','campaign','stories','story','edit','creative','direction','advertising','portfolio','latest','product','cfs','choice','furniture','superstore']);
const filmTokens=value=>normalize(value).split(' ').filter(token=>token.length>=3&&!filmStopWords.has(token));
const sameFilm=(a,b)=>{const left=filmTokens(a),right=new Set(filmTokens(b));return left.some(token=>right.has(token))};
const blankPoster='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/%3E';

const filmRail=document.querySelector('#filmRail');
const legacyFilms=[...filmRail.querySelectorAll('.film-card')].map(card=>{const a=card.querySelector('[data-film]'),img=a?.querySelector('img');return{title:a?.dataset.title||card.querySelector('h3')?.textContent||'Film',href:a?.href||'',poster:img?.getAttribute('src')||'',caption:card.querySelector('.film-caption p')?.textContent||'MOTION / PORTFOLIO'}});

let collection='banners',format='all',mediaType='all',galleryAssets=[],staticGalleryAssets=[],bucketWorks=[];
const gallery=document.querySelector('#creativeGallery');

function renderGallery(){
 gallery.querySelectorAll('[data-film]').forEach(a=>previewObserver.unobserve(a));
 const selected=galleryAssets.filter(a=>a.group===collection&&(format==='all'||a.format===format)&&(mediaType==='all'||(mediaType==='video'?!!a.video:!a.video)));
 document.querySelector('#galleryCount').textContent=`${selected.length} creative assets`;
 gallery.innerHTML=selected.map(a=>{
  const title=escapeHtml(a.title),link=escapeHtml(a.video||a.src),width=Number(a.width)||1600,height=Number(a.height)||900;
  const visual=a.src?`<img src="${escapeHtml(a.src)}" width="${width}" height="${height}" alt="${title} ${escapeHtml(a.format)} creative" loading="lazy">`:`<video muted loop playsinline preload="none" aria-hidden="true"></video>`;
  return`<figure class="creative-item"><a href="${link}" ${a.video?`data-film="gallery" data-title="${title}"`:'target="_blank" rel="noopener"'} aria-label="${a.video?'Play':'View'} ${title}">${visual}${a.video?'<span class="play">&#9654;</span>':''}</a><figcaption><h3>${title}</h3><span>${a.video?'Play video':'View artwork'} &nearr;</span></figcaption></figure>`;
 }).join('')||'<p>No matching creative. Try All creative or All sizes.</p>';
 autoplayPreviews(gallery);
}

document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>{collection=b.dataset.collection;format='all';mediaType='all';document.querySelectorAll('[data-media]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.media==='all')));document.querySelectorAll('[data-collection]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.format==='all')));renderGallery()}));
document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery()}));
document.querySelectorAll('[data-media]').forEach(b=>b.addEventListener('click',()=>{mediaType=b.dataset.media;document.querySelectorAll('[data-media]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery()}));

function galleryFromBucket(){
 return bucketWorks.filter(work=>work.type==='image').map(work=>({
  group:['banners','pmax','meta'].includes(work.group)?work.group:'banners',
  src:work.src,
  video:null,
  title:work.title||work.filename||'Portfolio work',
  format:['wide','square','portrait'].includes(work.format)?work.format:'wide',
  width:work.width||1600,
  height:work.height||900,
  uploaded:work.uploaded||''
 }));
}

function mergeGallery(){
 const seen=new Set(),merged=[];
 for(const item of [...galleryFromBucket(),...staticGalleryAssets]){
  const identity=normalize(item.video||item.src||`${item.title}-${item.format}`);
  if(!identity||seen.has(identity))continue;
  seen.add(identity);merged.push(item);
 }
 galleryAssets=merged;
}

function filmCard(work,index){
 const title=escapeHtml(work.title||work.filename||'Portfolio film'),href=escapeHtml(work.src),poster=work.poster?escapeHtml(work.poster):blankPoster,caption=escapeHtml(work.discipline||work.client||'MOTION / PORTFOLIO');
 return`<article class="film-card"><a href="${href}" data-film="dynamic-${escapeHtml(work.id||index)}" data-title="${title}" aria-label="Play ${title}"><img src="${poster}" alt="${title} film still" loading="lazy" width="1280" height="720"><span class="film-number">${String(index+1).padStart(2,'0')}</span><span class="play">▶</span><span class="watch">Watch film ↗</span></a><div class="film-caption"><h3>${title}</h3><p>${caption}</p></div></article>`;
}

function renderDynamicFilms(){
 const dynamic=bucketWorks.filter(work=>work.type==='video');
 if(!dynamic.length)return;
 filmRail.querySelectorAll('[data-film]').forEach(a=>previewObserver.unobserve(a));
 const legacy=legacyFilms.filter(item=>!dynamic.some(work=>sameFilm(item.title,work.title)||sameFilm(item.href.split('/').pop(),work.filename||work.title))).map((item,i)=>`<article class="film-card"><a href="${escapeHtml(item.href)}" data-film="legacy-${i}" data-title="${escapeHtml(item.title)}" aria-label="Play ${escapeHtml(item.title)}"><img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)} film still" loading="lazy" width="1280" height="720"><span class="film-number">${String(dynamic.length+i+1).padStart(2,'0')}</span><span class="play">▶</span><span class="watch">Watch film ↗</span></a><div class="film-caption"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.caption)}</p></div></article>`);
 filmRail.innerHTML=[...dynamic.map(filmCard),...legacy].join('');
 autoplayPreviews(filmRail);filmRail.dispatchEvent(new Event('scroll'));
}

function updateHero(){
 const latest=bucketWorks.find(work=>work.type==='video'),hero=document.querySelector('.hero-visual');
 if(!latest||!hero)return;
 hero.href=latest.src;hero.dataset.title=latest.title||latest.filename||'Featured film';
 const title=hero.querySelector('.visual-bottom h2'),client=hero.querySelector('.visual-bottom>span'),discipline=hero.querySelector('.visual-bottom p'),img=hero.querySelector('img'),preview=hero.querySelector('video');
 if(title)title.textContent=latest.title||latest.filename||'Featured film';
 if(client)client.textContent=(latest.client||'LATEST MOTION WORK').toUpperCase();
 if(discipline)discipline.textContent=latest.discipline||'Motion · Portfolio';
 if(img){if(latest.poster)img.src=latest.poster;img.alt=`${latest.title||'Featured film'} preview`}
 if(preview){preview.pause();preview.removeAttribute('src');preview.poster=latest.poster||img?.src||'';preview.src=latest.src;preview.load();if(!reduce.matches)preview.play().catch(()=>{})}
}

Promise.allSettled([
 fetch('/gallery.json').then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json()}),
 fetch('/api/works',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Works unavailable');return r.json()})
]).then(([galleryResult,worksResult])=>{
 staticGalleryAssets=galleryResult.status==='fulfilled'?galleryResult.value:[];
 bucketWorks=worksResult.status==='fulfilled'&&Array.isArray(worksResult.value?.works)?worksResult.value.works:[];
 mergeGallery();renderGallery();
 if(bucketWorks.length){renderDynamicFilms();updateHero()}
 if(galleryResult.status==='rejected'&&!bucketWorks.length)document.querySelector('#galleryCount').textContent='The gallery could not load. Please refresh the page.';
});

const logoRow=document.querySelector('.logo-row'),pauseLogos=document.querySelector('.logo-pause');
let logosPaused=false,logosHover=false,logosVisible=false,logoTime=0,logoPosition=0;
const originals=[...logoRow.children]; originals.forEach(img=>{const copy=img.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.alt='';copy.removeAttribute('title');logoRow.append(copy)});
pauseLogos.addEventListener('click',()=>{logosPaused=!logosPaused;pauseLogos.setAttribute('aria-pressed',String(logosPaused));pauseLogos.textContent=logosPaused?'Resume logos':'Pause logos'});
logoRow.addEventListener('pointerenter',()=>logosHover=true);logoRow.addEventListener('pointerleave',()=>logosHover=false);
new IntersectionObserver(entries=>{logosVisible=entries[0].isIntersecting}).observe(logoRow);
function moveLogos(time){const elapsed=Math.min(time-logoTime,50);logoTime=time;const focused=logoRow.contains(document.activeElement);if(logosVisible&&!logosPaused&&!logosHover&&!focused&&!reduce.matches&&!document.hidden){const gap=parseFloat(getComputedStyle(logoRow).gap);const distance=(logoRow.scrollWidth+gap)/2;logoPosition+=elapsed*.018;if(logoPosition>=distance)logoPosition-=distance;logoRow.scrollLeft=logoPosition}else logoPosition=logoRow.scrollLeft;requestAnimationFrame(moveLogos)}requestAnimationFrame(moveLogos);

// Autoplay film previews only while visible, retaining player links and posters.
const previewObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
 const preview=target.querySelector('video');if(!preview)return;
 if(isIntersecting){if(!preview.src)preview.src=target.href;if(!reduce.matches)preview.play().catch(()=>{})}else preview.pause();
}),{threshold:.1});
function autoplayPreviews(root=document){
 root.querySelectorAll('[data-film]').forEach(a=>{
  const existing=a.querySelector('video');if(existing){previewObserver.observe(a);return}
  const img=a.querySelector('img');if(!img)return;
  const preview=document.createElement('video');preview.autoplay=true;preview.muted=true;preview.defaultMuted=true;preview.loop=true;preview.playsInline=true;preview.preload='none';preview.poster=img.src;preview.setAttribute('aria-hidden','true');preview.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';preview.style.objectPosition=getComputedStyle(img).objectPosition;img.after(preview);previewObserver.observe(a);
 });
}
autoplayPreviews();
