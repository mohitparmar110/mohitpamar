const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu'}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close':'Menu'});
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.film-rail').forEach(rail=>{
 const arrows=[...document.querySelectorAll(`[data-direction][aria-controls="${rail.id}"]`)];
 function updateRail(){arrows[0].disabled=rail.scrollLeft<2;arrows[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2}
 function step(direction){const card=rail.querySelector('.film-card');rail.scrollBy({left:direction*(card.getBoundingClientRect().width+parseFloat(getComputedStyle(rail).gap)),behavior:reduce.matches?'instant':'smooth'})}
 arrows.forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.direction))));rail.addEventListener('scroll',updateRail,{passive:true});window.addEventListener('resize',updateRail);rail.addEventListener('keydown',e=>{if(e.target===rail&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});updateRail();
});
const dialog=document.querySelector('#player'),video=dialog.querySelector('video'),error=document.querySelector('#videoError');let opener;
document.addEventListener('click',e=>{const a=e.target.closest('[data-film]');if(!a)return;e.preventDefault();opener=a;document.querySelector('#playerTitle').textContent=a.dataset.title;error.hidden=true;error.querySelector('a').href=a.href;video.src=a.href;video.poster=a.querySelector('img').src;dialog.showModal();video.play().catch(()=>{});});
video.addEventListener('error',()=>{error.hidden=false});document.querySelector('#closePlayer').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();opener?.focus()});

let collection='banners',format='all',galleryAssets=[];
const gallery=document.querySelector('#creativeGallery');
function renderGallery(){const selected=galleryAssets.filter(a=>a.group===collection&&(format==='all'||a.format===format));document.querySelector('#galleryCount').textContent=`${selected.length} assets · Select an image to view full size`;gallery.innerHTML=selected.map(a=>`<figure class="creative-item"><a href="${a.video||a.src}" ${a.video?`data-film="gallery" data-title="${a.title}"`:'target="_blank" rel="noopener"'} aria-label="${a.video?'Play':'View'} ${a.title}"><img src="${a.src}" width="${a.width}" height="${a.height}" alt="${a.title} ${a.format} creative" loading="lazy">${a.video?'<span class="play">▶</span>':''}</a><figcaption><h3>${a.title}</h3><span>${a.width} × ${a.height}${a.video?' · MOTION':''} ↗</span></figcaption></figure>`).join('')||'<p>No assets in this format. Choose All sizes.</p>'}
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>{collection=b.dataset.collection;format='all';document.querySelectorAll('[data-collection]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.format==='all')));renderGallery()}));
document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery()}));
fetch('/gallery.json').then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json()}).then(data=>{galleryAssets=data;renderGallery()}).catch(()=>{document.querySelector('#galleryCount').textContent='The gallery could not load. Please refresh the page.'});

