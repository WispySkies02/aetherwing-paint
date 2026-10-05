(()=>{
  const root=document.documentElement;
  const params=new URLSearchParams(location.search);
  const forced=params.get('anniversary');
  const logo='/images/brand/aetherwing-anniversary-2015.png';
  const modernLogo='/images/brand/aetherwing-logo.png';
  const ANNIVERSARY_TIMEZONE='America/New_York';
  const partsInEastern=(date=new Date())=>{
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ANNIVERSARY_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter((part)=>part.type!=='literal').map((part)=>[part.type,part.value]));
    return {year:Number(parts.year),month:Number(parts.month),day:Number(parts.day)};
  };
  const activeNow=(date=new Date())=>{
    if(forced==='throwback'||forced==='retro'||forced==='on')return true;
    if(forced==='off'||forced==='modern')return false;
    const eastern=partsInEastern(date);
    return eastern.month===10&&eastern.day>=1&&eastern.day<=7;
  };
  const nextBoundary=(date=new Date())=>{
    const eastern=partsInEastern(date),year=eastern.year,now=date.getTime();
    const start=Date.UTC(year,9,1,4,0,0);
    const end=Date.UTC(year,9,8,4,0,0);
    if(now<start)return start;if(now<end)return end;return Date.UTC(year+1,9,1,4,0,0);
  };
  const syncLogos=(enabled)=>{
    document.querySelectorAll('.brand img,.aw-hud-logo,.footer-brand img').forEach(img=>{
      if(!(img instanceof HTMLImageElement))return;
      const target=enabled?logo:modernLogo;
      if(img.getAttribute('src')!==target)img.setAttribute('src',target);
    });
  };
  const ensureHud=()=>{
    let hud=document.querySelector('.aw-anniversary-hud');
    if(hud)return hud;
    hud=document.createElement('div');
    hud.className='aw-anniversary-hud';
    hud.setAttribute('aria-hidden','true');
    hud.innerHTML='<div class="aw-anniversary-hud__bug"><b class="aw-anniversary-hud__live">2015</b><span class="aw-anniversary-hud__channel"><b>AETHERWING ANNIVERSARY WEEK</b><small>DEBUT IDENTITY THROWBACK</small></span></div><div class="aw-anniversary-hud__bar"><b class="aw-anniversary-hud__identity"><i></i>EST. 2015</b><div class="aw-anniversary-hud__ticker"><span>BELLSOUTH RACING ROOTS · AETHERWING eMOTORSPORTS · THE PAINT BOOTH · BORN TO SOAR · BUILT TO FIGHT</span></div><b class="aw-anniversary-hud__era">OCT 01–07</b></div>';
    document.body.appendChild(hud);
    return hud;
  };
  const apply=()=>{
    const enabled=activeNow();
    root.setAttribute('data-anniversary-2015',String(enabled));
    root.removeAttribute('data-anniversary2015');
    const banner=document.querySelector('[data-anniversary-banner]');
    if(banner instanceof HTMLElement)banner.hidden=!enabled;
    syncLogos(enabled);
    const hud=ensureHud();
    if(hud instanceof HTMLElement)hud.hidden=!enabled;
    document.querySelectorAll('[data-paint-facility]').forEach(node=>node.toggleAttribute('data-anniversary-week',enabled));
    window.__AETHERWING_ANNIVERSARY_2015__={active:enabled,window:'October 1–7',timezone:ANNIVERSARY_TIMEZONE};
    return enabled;
  };
  apply();
  if(!forced){
    const scheduleBoundary=()=>{
      const delay=nextBoundary()-Date.now();
      if(delay>0&&delay<2147483600)setTimeout(()=>{apply();scheduleBoundary();},delay+75);
    };
    scheduleBoundary();
    setInterval(apply,60000);
  }
})();
