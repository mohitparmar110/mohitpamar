const menu=document.querySelector('#menu');
const nav=document.querySelector('#nav');
function closeMenu(){nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');if(menu)menu.textContent='Menu'}
menu?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');menu.setAttribute('aria-expanded',String(!!open));menu.textContent=open?'Close':'Menu'});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();if(document.querySelector('#player')?.open)document.querySelector('#player').close()}});

const dialog=document.querySelector('#player');
const player=dialog?.querySelector('video');
const playerTitle=document.querySelector('#playerTitle');
const playerError=document.querySelector('#playerError');
let opener=null;

document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-video]');
  if(!trigger||!dialog||!player)return;
  e.preventDefault();
  opener=trigger;
  const src=trigger.getAttribute('href')||trigger.dataset.video;
  const poster=trigger.dataset.poster||trigger.querySelector('img')?.currentSrc||trigger.querySelector('img')?.src||'';
  const title=trigger.dataset.title||'Film';
  if(playerTitle)playerTitle.textContent=title;
  if(playerError)playerError.hidden=true;
  player.poster=poster;
  player.src=src;
  dialog.showModal();
  player.play().catch(()=>{});
});

document.querySelector('#closePlayer')?.addEventListener('click',()=>dialog?.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
player?.addEventListener('error',()=>{if(playerError)playerError.hidden=false});
dialog?.addEventListener('close',()=>{
  player?.pause();
  player?.removeAttribute('src');
  player?.load();
  opener?.focus();
});

const socialGrid=document.querySelector('#socialManagementGrid');
const socialStatus=document.querySelector('#socialStatus');
let socialLoaded=false;

function rawText(work){return `${work?.title||''} ${work?.filename||''} ${work?.key||''} ${work?.client||''} ${work?.discipline||''}`.trim()}
function clean(value){return String(value||'').toLowerCase().replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').replace(/[^a-z0-9. ]+/g,' ').replace(/\s+/g,' ').trim()}
function isProfileCandidate(work){
  if(work?.type!=='image')return false;
  const raw=rawText(work);
  const text=clean(raw);
  if(/instagram|insta\b|social[ -]?media|profile|feed|grid|account management/i.test(raw))return true;
  if(/urbandeco\.ae\d*/i.test(raw)||/urban deco ae\d*/.test(text))return true;
  if(/urbandeco\.co\.uk/i.test(raw)&&/social|instagram|feed|profile/i.test(raw))return true;
  return false;
}
function profileScore(work){
  const raw=rawText(work);
  const text=clean(raw);
  let score=0;
  if(/instagram|insta\b/i.test(raw))score+=15;
  if(/profile|feed|grid|social[ -]?media/i.test(raw))score+=10;
  if(/urbandeco\.ae\d*/i.test(raw)||/urban deco ae\d*/.test(text))score+=9;
  if(work?.format==='portrait')score+=5;
  if(Number(work?.height)>Number(work?.width)&&Number(work?.width)>0)score+=4;
  if(/banner|sale|campaign|pmax|creative asset|product page|pdp|homepage/i.test(raw))score-=12;
  return score;
}
function socialTitle(work,index){
  const raw=rawText(work);
  if(/urbandeco\.ae|urban deco ae/i.test(raw))return index===0?'Urban Deco UAE — Instagram Direction':index===1?'Urban Deco UAE — Feed System':'Urban Deco UAE — Social Content';
  if(/urbandeco\.co\.uk|urban deco uk/i.test(raw))return 'Urban Deco UK — Social Media';
  return index===0?'Instagram — Account Direction':index===1?'Social Feed — Content System':'Social Media — Channel Management';
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}

async function loadSocialManagement(){
  if(socialLoaded||!socialGrid)return;
  socialLoaded=true;
  try{
    const response=await fetch('/api/works',{cache:'no-store'});
    if(!response.ok)throw new Error('Portfolio feed unavailable');
    const data=await response.json();
    const works=Array.isArray(data?.works)?data.works:[];
    const seen=new Set();
    const profiles=works
      .filter(isProfileCandidate)
      .sort((a,b)=>profileScore(b)-profileScore(a))
      .filter(work=>{const src=work.src;if(!src||seen.has(src))return false;seen.add(src);return true})
      .slice(0,3);
    if(!profiles.length)throw new Error('No social profile previews found');
    socialGrid.innerHTML=profiles.map((work,index)=>`<article class="social-card"><div class="social-shot"><img src="${escapeHtml(work.src)}" alt="${escapeHtml(socialTitle(work,index))} profile preview" loading="lazy" decoding="async"></div><h4>${escapeHtml(socialTitle(work,index))}</h4><p>Profile · Feed · Content Direction</p></article>`).join('');
    if(socialStatus)socialStatus.textContent='Selected account-management work — profile and feed direction, not campaign creatives.';
  }catch(error){
    socialGrid.innerHTML=`<article class="social-card"><div class="social-shot skeleton" aria-hidden="true"></div><h4>Social media management</h4><p>Profile & feed work loading from portfolio archive</p></article>`;
    if(socialStatus)socialStatus.textContent='Social profile previews are temporarily unavailable; the rest of the portfolio remains fully accessible.';
  }
}

if(socialGrid){
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loadSocialManagement()}
  },{rootMargin:'350px 0px'});
  observer.observe(socialGrid);
}

// Always begin horizontal work rails from the visual left edge, including BFCache restores.
function resetRails(){document.querySelectorAll('.reel-rail,.mobile-rail').forEach(rail=>{rail.scrollLeft=0})}
window.addEventListener('pageshow',()=>requestAnimationFrame(resetRails));
resetRails();
