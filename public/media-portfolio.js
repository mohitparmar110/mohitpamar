(()=>{
 'use strict';
 const isVideo=document.body.dataset.collection==='videos';
 const categories=isVideo?[['all','All videos'],['product','Product films'],['social','Social reels'],['campaign','Campaign videos'],['banners','Animated banners'],['motion','Motion / Animations']]:[['all','All designs'],['banners','Banners'],['ads','Ads'],['campaign','Campaign Assets'],['social','Social Creatives'],['motion','Motion / Animations'],['identity','Brand Identity'],['commerce','E-commerce Assets'],['web','UI / Web Designs'],['other','Other Work']];
 const select=document.querySelector('#category'),grid=document.querySelector('#media-grid'),count=document.querySelector('#media-count'),empty=document.querySelector('#media-empty'),reset=document.querySelector('#reset-filter');
 const viewer=document.querySelector('#media-viewer'),content=document.querySelector('#viewer-content'),title=document.querySelector('#viewer-title'),original=document.querySelector('#viewer-original'),error=document.querySelector('#viewer-error');
 let works=[],opener;
 const labels=Object.fromEntries(categories);
 const initial=new URL(location.href).searchParams.get('category');
 for(const [key,label] of categories){const o=new Option(label,key);select.add(o);}
 select.value=labels[initial]?initial:'all';
 function openWork(work,button){
  opener=button;title.textContent=work.title;error.hidden=true;content.replaceChildren();
  const media=document.createElement(work.video?'video':'img');
  media.src=work.video||work.src;original.href=media.src;
  if(work.video){media.dataset.manualPlayback='';media.controls=true;media.playsInline=true;media.preload='metadata';media.poster=work.src;media.setAttribute('aria-label',work.title);}else{media.alt=work.title;if(work.format==='website')media.className='website-image';}
  media.addEventListener('error',()=>{error.hidden=false;});
  content.append(media);viewer.showModal();
  if(work.video)media.play().catch(()=>{});
 }
 function render(){
  const list=works.filter(w=>select.value==='all'||w.categories.includes(select.value));grid.replaceChildren();empty.hidden=!!list.length;reset.hidden=select.value==='all';
  count.textContent=`${list.length} ${list.length===1?'project':'projects'}${select.value==='all'?'':' · '+labels[select.value]}`;
  if(!list.length){empty.replaceChildren();const p=document.createElement('p');p.textContent='No published work in this category yet. Explore another category or view the full collection.';empty.append(p);}
  for(const [index,work] of list.entries()){
   const article=document.createElement('article');article.className='media-card';
   const button=document.createElement('button');button.type='button';button.className='media-open';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',`${work.video?'Play':'View'} ${work.title}`);
   const thumb=document.createElement('div');thumb.className='media-thumb';
   const img=document.createElement('img');img.src=work.src;img.alt=work.title;img.loading=index<3?'eager':'lazy';img.decoding='async';if(work.width&&work.height){img.width=work.width;img.height=work.height;}thumb.append(img);
   if(work.video){const play=document.createElement('span');play.className='media-play';play.textContent='Play film';thumb.append(play);}
   const info=document.createElement('div');info.className='media-card-info';const detail=document.createElement('div');const heading=document.createElement('h2');heading.textContent=work.title;const tag=document.createElement('p');tag.textContent=work.video?(work.categories.includes('banners')?'Animated banner':work.categories.includes('product')?'Product film':'Social reel'):work.format==='website'?'UI / Web Design':work.group==='meta'?'Social Creative':work.group==='pmax'?'Performance Ad':'Banner';detail.append(heading,tag);const number=document.createElement('span');number.className='media-index';number.textContent=String(index+1).padStart(2,'0')+' ↗';info.append(detail,number);button.append(thumb,info);button.addEventListener('click',()=>openWork(work,button));article.append(button);grid.append(article);
  }
 }
 function filterChanged(){const url=new URL(location.href);if(select.value==='all')url.searchParams.delete('category');else url.searchParams.set('category',select.value);history.replaceState(null,'',url);render();}
 select.addEventListener('change',filterChanged);reset.addEventListener('click',()=>{select.value='all';filterChanged();select.focus();});
 document.querySelector('#viewer-close').addEventListener('click',()=>viewer.close());
 viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close();}});
 viewer.addEventListener('close',()=>{const video=content.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}content.replaceChildren();opener?.focus();});
 fetch('/media-work.json').then(r=>{if(!r.ok)throw new Error('Portfolio unavailable');return r.json();}).then(data=>{works=data.filter(w=>isVideo?w.type==='video':w.type==='image'||w.categories.includes('banners'));render();}).catch(()=>{count.textContent='Portfolio unavailable';empty.hidden=false;empty.textContent='The portfolio could not load. Please refresh to try again.';});
})();
