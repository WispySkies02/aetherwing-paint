(() => {
  'use strict';

  const STORAGE_KEY = 'aetherwing-paint-ops';
  const PUBLIC_ENDPOINT = '/.netlify/functions/paint-data';
  const catalog = window.AetherwingPaintCatalog;
  const CACHE_KEY = 'aetherwing-published-paint-catalog-v1';
  const badgeLabels = {
    prized: 'Prized Livery', patriotic: 'Patriotic', concept: 'Concept', tribute: 'Tribute',
    starclutch: 'StarClutch Racing Alliance', legacy: 'Legacy / Part-Time',
    racewinner: 'Race Winner', throwback: 'Throwback', dash4cash: 'Dash4Cash', chase: 'Chase',
    special: 'Special Paint', crownjewel: 'Crown Jewel', championship: 'Championship',
    allstar: 'All-Star', anniversary: 'Anniversary', charity: 'Charity', holiday: 'Holiday',
    memorial: 'Memorial', alternate: 'Alternate Scheme'
  };
  const leagueColors = {
    nrrs: '#18c2ff', 'uarl-d1': '#ff5eb8', 'uarl-d2': '#9f6bff',
    'uarl-open': '#d8ff3e', kmart: '#ff6a00', 'sunoco-truck': '#ffd236', iracing: '#00d0ff'
  };
  const leagueOrder = ['nrrs','uarl-d1','uarl-open','kmart','sunoco-truck','iracing','uarl-d2'];
  const leagueRevealLogos = {
    nrrs: '/images/leagues/nrrs.png',
    'uarl-d1': '/images/leagues/uarl-d1.png',
    'uarl-open': '/images/leagues/uarl-open.png',
    'sunoco-truck': '/images/leagues/sunoco.png',
    iracing: '/images/leagues/iracing.png',
    'uarl-d2': '/images/leagues/uarl-d2.png'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function identityCopy(driver, username = '', league = '') {
    const name = String(driver || '');
    if (league === 'uarl-d2' && name === 'Wispy') return { primary:'Wispy', secondary:'@Aokikoto · now Hailey' };
    if (name === 'Hailey Bell' || name === 'Nicholas Waggoner') return { primary:'Hailey Bell', secondary:'' };
    if (name === 'Hailey' || name === 'Wispy') return { primary:'Hailey', secondary:username || '@Aokikoto' };
    return { primary:name || 'Team Entry', secondary:username || '' };
  }

  function readLocalRegistry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  async function readRegistry() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(PUBLIC_ENDPOINT, { cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal });
      if (!response.ok) throw new Error(`Registry returned ${response.status}`);
      const registry = await response.json();
      if (!Array.isArray(registry?.paints)) throw new Error('Invalid published catalog');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(registry)); } catch {}
      return { registry, source:'published' };
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (Array.isArray(cached?.paints)) return { registry:cached, source:'cached' };
      } catch {}
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const local = readLocalRegistry();
        if (Array.isArray(local.paints) && local.paints.length) return { registry:local, source:'local' };
      }
      return { registry:null, source:'bundled' };
    } finally {
      clearTimeout(timer);
    }
  }

  function featureSlugs(feature) {
    return [...new Set((Array.isArray(feature?.slugs) && feature.slugs.length ? feature.slugs : feature?.slug ? [feature.slug] : []).map(String).filter(Boolean))];
  }

  function isFeatureLive(feature) {
    if (!featureSlugs(feature).length) return false;
    if (!feature.expiresAt) return true;
    return Date.now() < Date.parse(feature.expiresAt);
  }

  const revealSlug = (value) => String(value || 'race-day').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'race-day';

  function loadRevealImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => resolve(null), 7000);
      image.crossOrigin = 'anonymous';
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); resolve(null); };
      image.src = new URL(source, location.href).href;
    });
  }

  function fitRevealText(context, value, maxWidth, startSize, weight = 900, family = 'Arial Narrow, Arial, sans-serif') {
    let size = startSize;
    do {
      context.font = `${weight} ${size}px ${family}`;
      if (context.measureText(String(value)).width <= maxWidth) break;
      size -= 2;
    } while (size > 18);
    return size;
  }

  function revealLeagueLogo(league, paints) {
    if (league !== 'kmart') return leagueRevealLogos[league] || '';
    const tags = new Set(paints.flatMap((paint) => Array.isArray(paint.special) ? paint.special : []));
    if (tags.has('chase')) return '/images/leagues/kmart-chase.png';
    if (tags.has('dash4cash')) return '/images/leagues/kmart-d4c.png';
    return '/images/leagues/kmart-regular.jpg';
  }

  function drawContainedLogo(context, image, x, y, maxWidth, maxHeight) {
    if (!image?.naturalWidth || !image?.naturalHeight) return false;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
    return true;
  }

  const revealBoundsCache = new WeakMap();

  function revealVisibleBounds(image) {
    if (!image?.naturalWidth || !image?.naturalHeight) return null;
    if (revealBoundsCache.has(image)) return revealBoundsCache.get(image);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sampleScale = Math.min(1, 1200 / Math.max(sourceWidth, sourceHeight));
    const sampleWidth = Math.max(1, Math.round(sourceWidth * sampleScale));
    const sampleHeight = Math.max(1, Math.round(sourceHeight * sampleScale));
    const sample = document.createElement('canvas');
    sample.width = sampleWidth;
    sample.height = sampleHeight;
    const sampleContext = sample.getContext('2d', { willReadFrequently:true });
    let bounds = { x:0, y:0, width:sourceWidth, height:sourceHeight };
    try {
      sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
      let transparentPixels = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] <= 12) transparentPixels += 1;
      }
      const usesTransparency = transparentPixels > sampleWidth * sampleHeight * .005;
      const cornerSize = Math.max(2, Math.min(12, Math.round(Math.min(sampleWidth, sampleHeight) * .025)));
      const cornerColors = [];
      const collectCorner = (startX, startY) => {
        for (let y = startY; y < startY + cornerSize; y += 1) {
          for (let x = startX; x < startX + cornerSize; x += 1) {
            const offset = (y * sampleWidth + x) * 4;
            if (pixels[offset + 3] > 200) cornerColors.push([pixels[offset], pixels[offset + 1], pixels[offset + 2]]);
          }
        }
      };
      collectCorner(0, 0);
      collectCorner(sampleWidth - cornerSize, 0);
      collectCorner(0, sampleHeight - cornerSize);
      collectCorner(sampleWidth - cornerSize, sampleHeight - cornerSize);
      const background = cornerColors.length ? cornerColors.reduce((total, color) => {
        total[0] += color[0]; total[1] += color[1]; total[2] += color[2];
        return total;
      }, [0,0,0]).map((value) => value / cornerColors.length) : [0,0,0];
      let left = sampleWidth;
      let top = sampleHeight;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          const offset = (y * sampleWidth + x) * 4;
          const alpha = pixels[offset + 3];
          if (alpha <= 12) continue;
          if (!usesTransparency) {
            const red = pixels[offset];
            const green = pixels[offset + 1];
            const blue = pixels[offset + 2];
            const distance = Math.sqrt((red - background[0]) ** 2 + (green - background[1]) ** 2 + (blue - background[2]) ** 2);
            if (distance < 30 && Math.max(red, green, blue) < 28) continue;
          }
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      if (right >= left && bottom >= top) {
        const padX = Math.max(2, Math.round((right - left + 1) * .025));
        const padY = Math.max(2, Math.round((bottom - top + 1) * .035));
        left = Math.max(0, left - padX);
        right = Math.min(sampleWidth - 1, right + padX);
        top = Math.max(0, top - padY);
        bottom = Math.min(sampleHeight - 1, bottom + padY);
        bounds = {
          x:left / sampleScale,
          y:top / sampleScale,
          width:(right - left + 1) / sampleScale,
          height:(bottom - top + 1) / sampleScale
        };
      }
    } catch {
      // If pixel inspection is unavailable, safely fall back to the complete render.
    }
    revealBoundsCache.set(image, bounds);
    return bounds;
  }

  function drawRevealPaint(context, image, x, y, maxWidth, maxHeight) {
    const bounds = revealVisibleBounds(image);
    if (!bounds) return false;
    const insetX = Math.min(18, maxWidth * .018);
    const insetY = Math.min(10, maxHeight * .025);
    const targetWidth = Math.max(1, maxWidth - insetX * 2);
    const targetHeight = Math.max(1, maxHeight - insetY * 2);
    // Let the vehicle occupy the card instead of preserving a large halo of
    // empty render space. The small controlled overfill is clipped to the
    // image bay, so titles and badges remain untouched.
    const scale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height) * 1.18;
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    const opticalDrop = Math.min(30, maxHeight * .07);
    const drawX = x + (maxWidth - width) / 2;
    const drawY = y + (maxHeight - height) / 2 + opticalDrop;
    context.save();
    context.beginPath();
    context.rect(x, y, maxWidth, maxHeight);
    context.clip();
    context.drawImage(
      image,
      bounds.x, bounds.y, bounds.width, bounds.height,
      drawX, drawY,
      width, height
    );
    context.restore();
    return true;
  }

  const revealBadgeStyles = {
    dash4cash: ['#18c2ff','#00151d'], chase: ['#d88bff','#200a2a'], throwback: ['#ffb800','#251800'],
    special: ['#ff6aa8','#290817'], patriotic: ['#fff','#c51e2d'], racewinner: ['#050505','#00e878'],
    crownjewel: ['#050505','#f4d47c'], championship: ['#050505','#ffb800'], allstar: ['#050505','#f5f5f5'],
    tribute: ['#fff','#7252ae'], concept: ['#fff','#356c91'], prized: ['#050505','#f4d47c'],
    legacy: ['#fff','#555'], anniversary: ['#050505','#e7c46c'], charity: ['#fff','#d53c88'],
    holiday: ['#fff','#14854d'], memorial: ['#fff','#4c5664'], alternate: ['#fff','#4c6fa8']
  };

  function drawRevealBadges(context, paint, x, y, maxWidth) {
    const tags = [...new Set((paint.special || []).filter((tag) => tag !== 'starclutch' && badgeLabels[tag]))];
    if (!tags.length) return 0;
    context.font = '900 14px monospace';
    let cursorX = x;
    let cursorY = y;
    let lines = 1;
    tags.forEach((tag) => {
      const label = String(badgeLabels[tag] || tag).toUpperCase();
      const width = Math.ceil(context.measureText(label).width) + 22;
      if (cursorX !== x && cursorX + width > x + maxWidth) { cursorX = x; cursorY += 27; lines += 1; }
      const [foreground, background] = revealBadgeStyles[tag] || ['#fff','#30343a'];
      context.fillStyle = background;
      context.fillRect(cursorX, cursorY, width, 22);
      context.strokeStyle = foreground;
      context.lineWidth = 1;
      context.strokeRect(cursorX + .5, cursorY + .5, width - 1, 21);
      context.fillStyle = foreground;
      context.fillText(label, cursorX + 11, cursorY + 16);
      cursorX += width + 8;
    });
    return lines * 27;
  }

  async function buildTeamReveal(feature, paints) {
    await document.fonts?.ready?.catch?.(() => {});
    await document.fonts?.load?.('82px "Road Rage"')?.catch?.(() => {});
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image creator is unavailable in this browser.');
    const league = paints[0]?.leagues?.[0] || '';
    const accent = leagueColors[league] || '#18c2ff';
    const isScrLeague = ['kmart','sunoco-truck'].includes(league);
    const [images, leagueLogo, teamLogo] = await Promise.all([
      Promise.all(paints.map((paint) => loadRevealImage(paint.image))),
      revealLeagueLogo(league, paints) ? loadRevealImage(revealLeagueLogo(league, paints)) : Promise.resolve(null),
      loadRevealImage(isScrLeague ? '/images/brand/scr.png' : '/images/brand/aetherwing-logo.png')
    ]);
    const gradient = context.createLinearGradient(0, 0, 1600, 900);
    gradient.addColorStop(0, '#030405');
    gradient.addColorStop(.58, '#090b0d');
    gradient.addColorStop(1, '#020202');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1600, 900);
    context.strokeStyle = 'rgba(255,255,255,.045)';
    context.lineWidth = 1;
    for (let x = -900; x < 1700; x += 74) { context.beginPath(); context.moveTo(x, 900); context.lineTo(x + 900, 0); context.stroke(); }
    context.fillStyle = '#ff2633';
    context.fillRect(0, 0, 1600, 13);
    context.fillStyle = accent;
    context.fillRect(0, 13, 1600, 7);
    context.fillStyle = 'rgba(0,0,0,.36)';
    context.fillRect(56, 30, 380, 96);
    context.strokeStyle = 'rgba(255,255,255,.13)';
    context.lineWidth = 1;
    context.strokeRect(56.5, 30.5, 379, 95);
    drawContainedLogo(context, leagueLogo, 70, 39, 150, 76);
    context.fillStyle = 'rgba(255,255,255,.2)';
    context.fillRect(237, 47, 2, 60);
    drawContainedLogo(context, teamLogo, 256, 39, 160, 76);
    context.fillStyle = accent;
    context.font = '900 20px monospace';
    context.fillText(isScrLeague ? 'SCR AFFILIATE // RACE DAY REVEAL' : 'AETHERWING // RACE DAY REVEAL', 462, 83);
    const raceTitle = feature.race || 'UPCOMING RACE';
    fitRevealText(context, raceTitle.toUpperCase(), 1040, 82, 400, '"Road Rage", "Road Rage", cursive');
    context.fillStyle = '#fff';
    context.fillText(raceTitle.toUpperCase(), 70, 211);
    context.fillStyle = '#9da3a8';
    context.font = '700 24px monospace';
    context.fillText([feature.series, feature.track, feature.date].filter(Boolean).join('  //  '), 74, 248);
    context.textAlign = 'right';
    context.fillStyle = '#fff';
    context.font = '900 78px Arial Narrow, Arial, sans-serif';
    context.fillText(String(paints.length).padStart(2, '0'), 1530, 130);
    context.fillStyle = '#8b9298';
    context.font = '900 18px monospace';
    context.fillText(`PAINT${paints.length === 1 ? '' : 'S'} IN THE LINEUP`, 1530, 162);
    context.textAlign = 'left';

    const count = paints.length;
    const columns = count <= 2 ? count : count <= 4 ? 2 : count <= 9 ? 3 : 4;
    const rows = Math.ceil(count / columns);
    const gap = 18;
    const left = 70;
    const top = 278;
    const availableWidth = 1460;
    const availableHeight = 535;
    const cardWidth = (availableWidth - gap * (columns - 1)) / columns;
    const cardHeight = (availableHeight - gap * (rows - 1)) / rows;
    paints.forEach((paint, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + column * (cardWidth + gap);
      const y = top + row * (cardHeight + gap);
      context.fillStyle = 'rgba(9,11,13,.94)';
      context.fillRect(x, y, cardWidth, cardHeight);
      context.strokeStyle = index === 0 ? accent : '#30353a';
      context.lineWidth = index === 0 ? 4 : 2;
      context.strokeRect(x, y, cardWidth, cardHeight);
      context.fillStyle = accent;
      context.fillRect(x, y, 8, cardHeight);
      const badgeHeight = drawRevealBadges(context, paint, x + 24, y + 12, cardWidth - 48);
      const image = images[index];
      const imageX = x + 24;
      const imageY = y + 12 + badgeHeight;
      const imageWidth = cardWidth - 48;
      const imageHeight = Math.max(45, cardHeight - 76 - badgeHeight);
      if (image) {
        drawRevealPaint(context, image, imageX, imageY, imageWidth, imageHeight);
      } else {
        context.fillStyle = '#121519';
        context.fillRect(imageX, imageY, imageWidth, imageHeight);
        context.fillStyle = '#5f666c';
        context.font = '900 18px monospace';
        context.textAlign = 'center';
        context.fillText('PAINT RENDER', x + cardWidth / 2, imageY + imageHeight / 2);
        context.textAlign = 'left';
      }
      const identity = identityCopy(paint.driver, paint.username, paint.leagues?.[0] || '');
      context.fillStyle = '#fff';
      const sponsorSize = fitRevealText(context, paint.sponsor.toUpperCase(), cardWidth - 150, rows > 2 ? 25 : 31);
      context.font = `900 ${sponsorSize}px Arial Narrow, Arial, sans-serif`;
      context.fillText(paint.sponsor.toUpperCase(), x + 24, y + cardHeight - 31);
      context.textAlign = 'right';
      context.fillStyle = accent;
      context.font = `900 ${rows > 2 ? 26 : 32}px monospace`;
      context.fillText(catalog.numberLabel(paint), x + cardWidth - 22, y + cardHeight - 31);
      context.textAlign = 'left';
      context.fillStyle = '#91989e';
      context.font = `700 ${rows > 2 ? 14 : 17}px monospace`;
      context.fillText(identity.primary.toUpperCase(), x + 24, y + cardHeight - 10);
    });
    context.fillStyle = '#777e84';
    context.font = '700 18px monospace';
    context.fillText('PAINT.AETHERWING.NET', 70, 866);
    context.textAlign = 'right';
    context.fillStyle = '#fff';
    context.fillText('SHARP IDENTITY // CLEAN EXECUTION', 1530, 866);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The reveal image could not be created.')), 'image/png', 1));
  }

  async function shareTeamReveal(feature, paints, button) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'BUILDING REVEAL…';
    try {
      const blob = await buildTeamReveal(feature, paints);
      const filename = `aetherwing-${revealSlug(feature.race)}-${feature.date || 'race-day'}-team-reveal.png`;
      const file = new File([blob], filename, { type:'image/png' });
      if (navigator.canShare?.({ files:[file] })) {
        await navigator.share({ files:[file], title:`Aetherwing — ${feature.race || 'Race Day'} paint reveal` });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);
        button.textContent = 'REVEAL DOWNLOADED';
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        button.textContent = 'TRY AGAIN';
        button.title = error?.message || 'Could not create the team reveal.';
        await new Promise((resolve) => setTimeout(resolve, 1400));
      }
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function renderFeature(feature, paints) {
    const section = document.querySelector('[data-featured-run]');
    if (!(section instanceof HTMLElement)) return;
    if (!isFeatureLive(feature)) {
      section.hidden = true;
      return;
    }
    const selected = featureSlugs(feature).map((slug) => normalizeIdentity(paints.find((item) => item.slug === slug))).filter(Boolean);
    if (!selected.length) {
      section.hidden = true;
      return;
    }
    const paint = selected[0];
    const league = paint.leagues?.[0] || feature.series || '';
    const identity = identityCopy(paint.driver, paint.username, paint.leagues?.[0] || '');
    const raceLine = [feature.race, feature.track].filter(Boolean).join(' · ');
    const dateText = feature.date
      ? new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${feature.date}T12:00:00`))
      : 'Race date to be announced';
    section.style.setProperty('--feature-image', `url("${String(paint.image).replace(/["\\]/g, '')}")`);
    section.style.setProperty('--feature-accent', leagueColors[league] || '#18c2ff');
    section.innerHTML = `
      <div class="shell aw-featured-run__inner">
        <div class="aw-featured-run__copy">
          <p class="aw-featured-run__eyebrow">${selected.length > 1 ? `${selected.length} next race paints` : 'Next race paint'}</p>
          <h1>${esc(selected.length > 1 ? 'SCR Race Lineup' : paint.sponsor)}</h1>
          ${selected.length === 1 ? `<div class="aw-featured-run__driver"><strong>${esc(identity.primary)}</strong><span>${esc(identity.secondary)}</span></div>` : ''}
          ${feature.message ? `<p class="aw-featured-run__message">${esc(feature.message)}</p>` : ''}
          <div class="aw-featured-run__paint-grid">${selected.map((item) => {
            const itemIdentity = identityCopy(item.driver, item.username, item.leagues?.[0] || '');
            return `<a href="#paint-${encodeURIComponent(item.slug)}" data-feature-load="${esc(item.slug)}"><img src="${esc(item.image)}" alt=""><span><strong>${esc(item.sponsor)}</strong><small>${esc(item.number ? `#${item.number} · ${itemIdentity.primary}` : itemIdentity.primary)}</small></span></a>`;
          }).join('')}</div>
        </div>
        <div class="aw-featured-run__race"><span>${esc(feature.series || league || 'Upcoming race')}</span><strong>${esc(raceLine || 'Upcoming race')}</strong><small>${esc(dateText)}</small><button type="button" class="aw-featured-run__share" data-share-team-reveal>Share team reveal</button></div>
      </div>`;
    section.hidden = false;
    section.querySelectorAll('[data-feature-load]').forEach((link) => link.addEventListener('click', (event) => {
      const api = window.AetherwingBooth;
      if (api?.selectPaint) {
        event.preventDefault();
        api.selectPaint(link.dataset.featureLoad, true);
        document.querySelector('[data-paint-facility]')?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'
        });
      }
    }));
    section.querySelector('[data-share-team-reveal]')?.addEventListener('click', (event) => shareTeamReveal(feature, selected, event.currentTarget));
  }

  function normalizeIdentity(paint) {
    if (!paint) return paint;
    const league = paint?.leagues?.[0] || '';
    if (league === 'iracing' && catalog.isHailey(paint?.driver)) return { ...paint, driver:'Hailey Bell', username:'' };
    if (league !== 'uarl-d2' && ['wispy','hailey'].includes(String(paint?.driver || '').toLowerCase())) return { ...paint, driver:'Hailey', username:'@Aokikoto' };
    return paint;
  }

  function paintCard(rawPaint) {
    const paint = normalizeIdentity(rawPaint);
    const identity = identityCopy(paint.driver, paint.username, paint.leagues?.[0] || '');
    const league = paint.leagues?.[0] || '';
    const leagueName = paint.leagueName || league.replace(/-/g, ' ');
    const tags = (paint.special || []).map((tag) => `<span class="is-${esc(tag)}">${esc(badgeLabels[tag] || tag)}</span>`).join('');
    const hasNumber = catalog.hasNumber(paint);
    const enduranceEntry = catalog.isEndurance(paint);
    const cardCredential = catalog.numberLabel(paint);
    const sponsorHeading = enduranceEntry
      ? `<h3 class="aw-collection-title is-endurance"><span class="aw-endurance-credential">ENDURANCE</span><span class="aw-endurance-separator" aria-hidden="true">·</span><span class="aw-collection-sponsor">${esc(paint.sponsor)}</span></h3>`
      : `<h3>${esc(paint.sponsor)}</h3>`;
    const search = [paint.driver, paint.username, identity.primary, identity.secondary, paint.sponsor, paint.manufacturer, paint.body, cardCredential, ...(paint.tags || [])].join(' ');
    return `<article class="aw-collection-card" id="paint-${esc(paint.slug)}" data-collection-card data-dynamic-paint data-slug="${esc(paint.slug)}" data-driver="${esc(paint.driver)}" data-leagues="${esc((paint.leagues || []).join(' '))}" data-search="${esc(search)}">
      <button type="button" class="aw-collection-image" data-load-dynamic-paint="${esc(paint.slug)}">
        <img class="aw-deferred-image" data-src="${esc(paint.image)}" alt="${esc(`${hasNumber ? '#' + paint.number + ' ' : enduranceEntry ? 'Endurance ' : ''}${identity.primary} — ${paint.sponsor} paint scheme render`)}" loading="lazy" fetchpriority="low" decoding="async">
        <span>LOAD INTO BOOTH</span>
      </button>
      <div class="aw-collection-copy">
        <div class="aw-collection-top"><span>${esc(leagueName)}</span>${enduranceEntry ? '' : `<strong>${esc(cardCredential)}</strong>`}</div>
        ${sponsorHeading}
        <p>${esc(identity.primary)}${identity.secondary ? `<small>${esc(identity.secondary)}</small>` : ''}</p>
        <div class="aw-collection-specs"><span>${esc(paint.manufacturer)}</span><span>${esc(paint.body)}</span></div>
        ${paint.note ? `<small>${esc(paint.note)}</small>` : ''}
        <div class="aw-collection-badges">${tags}</div>
        <div class="aw-collection-actions">
          ${paint.schemeId ? `<button type="button" data-dynamic-copy-id="${esc(paint.schemeId)}">COPY ID</button>` : `<span>${esc(catalog.paintType(paint))}</span>`}

        </div>
      </div>
    </article>`;
  }

  async function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  const primaryLeague = (paint) => paint?.leagues?.[0] || '';
  const leagueIndex = (league) => {
    const index = leagueOrder.indexOf(league);
    return index === -1 ? leagueOrder.length : index;
  };

  function orderDynamicPaints(paints, featuredSlugs = []) {
    const featuredOrder = new Map(featuredSlugs.map((slug, index) => [slug, index]));
    return paints.map((paint, index) => ({ paint, index })).sort((a, b) => {
      const leagueDelta = leagueIndex(primaryLeague(a.paint)) - leagueIndex(primaryLeague(b.paint));
      if (leagueDelta) return leagueDelta;
      if (featuredOrder.size && primaryLeague(a.paint) === primaryLeague(b.paint)) {
        const aRank = featuredOrder.has(a.paint.slug) ? featuredOrder.get(a.paint.slug) : Number.MAX_SAFE_INTEGER;
        const bRank = featuredOrder.has(b.paint.slug) ? featuredOrder.get(b.paint.slug) : Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      return a.index - b.index;
    }).map((entry) => entry.paint);
  }

  function groupCollectionCards(feature) {
    const grid = document.querySelector('[data-collection-grid]');
    if (!(grid instanceof HTMLElement)) return;
    const featuredSlugs = isFeatureLive(feature) ? featureSlugs(feature) : [];
    const featuredSet = new Set(featuredSlugs);
    const featuredOrder = new Map(featuredSlugs.map((slug, index) => [slug, index]));
    const cards = Array.from(grid.querySelectorAll('[data-collection-card]'));
    cards.forEach((card, index) => {
      if (!(card instanceof HTMLElement)) return;
      if (!card.dataset.basePaintOrder) card.dataset.basePaintOrder = String(index);
      card.classList.toggle('is-next-race-feature', featuredSet.has(card.dataset.slug));
      card.querySelector('.aw-next-race-chip')?.remove();
      if (featuredSet.has(card.dataset.slug)) {
        const copy = card.querySelector('.aw-collection-copy');
        if (copy instanceof HTMLElement) copy.insertAdjacentHTML('afterbegin', '<span class="aw-next-race-chip">NEXT RACE PAINT</span>');
      }
    });
    cards.sort((a, b) => {
      const aLeague = (a.dataset.leagues || '').split(/\s+/).filter(Boolean)[0] || '';
      const bLeague = (b.dataset.leagues || '').split(/\s+/).filter(Boolean)[0] || '';
      const leagueDelta = leagueIndex(aLeague) - leagueIndex(bLeague);
      if (leagueDelta) return leagueDelta;
      if (featuredSet.size && aLeague === bLeague) {
        const aRank = featuredOrder.has(a.dataset.slug) ? featuredOrder.get(a.dataset.slug) : Number.MAX_SAFE_INTEGER;
        const bRank = featuredOrder.has(b.dataset.slug) ? featuredOrder.get(b.dataset.slug) : Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      return Number(a.dataset.basePaintOrder || 0) - Number(b.dataset.basePaintOrder || 0);
    }).forEach((card) => grid.append(card));
    document.dispatchEvent(new CustomEvent('paintops:cardschanged'));
  }

  function syncCollectionCards(paints, featuredSlugs = []) {
    const grid = document.querySelector('[data-collection-grid]');
    if (!(grid instanceof HTMLElement)) return;
    const slugs = new Set(paints.map(paint => paint.slug));
    grid.querySelectorAll('[data-collection-card]').forEach(card => { if (!slugs.has(card.dataset.slug)) card.remove(); });
    for (const paint of orderDynamicPaints(paints, featuredSlugs)) {
      if (!paint?.slug) continue;
      const template = document.createElement('template');
      template.innerHTML = paintCard(paint).trim();
      const fresh = template.content.firstElementChild;
      if (!(fresh instanceof HTMLElement)) continue;
      const existing = document.getElementById(`paint-${paint.slug}`);
      if (existing) existing.replaceWith(fresh);
      else grid.append(fresh);
    }
    document.dispatchEvent(new CustomEvent('paintops:cardschanged'));
  }

  function bindDynamicCards() {
    document.addEventListener('click', async (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-load-dynamic-paint],[data-dynamic-copy-id]') : null;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.loadDynamicPaint) {
        const paint = window.AetherwingBooth?.paints.find(paint => paint.slug === target.dataset.loadDynamicPaint);
        if (!paint) return;
        window.AetherwingBooth?.selectPaint?.(paint.slug, true);
        document.querySelector('[data-paint-facility]')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else if (target.dataset.dynamicCopyId) {
        await copy(target.dataset.dynamicCopyId);
      }
    });
  }

  let currentFeature = null;
  function renderCatalog() {
    const paints = window.AetherwingBooth?.paints || [];
    const featuredSlugs = isFeatureLive(currentFeature) ? featureSlugs(currentFeature) : [];
    syncCollectionCards(paints, featuredSlugs);
    groupCollectionCards(currentFeature);
    renderFeature(currentFeature, paints);
  }

  async function start() {
    bindDynamicCards();
    document.addEventListener('aetherwing:catalog-change', renderCatalog);
    const { registry, source } = await readRegistry();
    currentFeature = registry?.feature || null;
    const featuredSlugs = isFeatureLive(currentFeature) ? featureSlugs(currentFeature) : [];
    window.AetherwingBooth?.setFeaturedPaints?.(featuredSlugs);
    if (registry) window.AetherwingBooth?.replacePaints?.(registry.paints);
    else renderCatalog();
    document.querySelectorAll('[data-league-controls],[data-driver-controls],[data-paint-controls],[data-collection-grid]').forEach(node => node.setAttribute('aria-busy', 'false'));
    const status = document.querySelector('[data-catalog-status]');
    if (status) status.textContent = {
      published:'Published catalog', cached:'Cached catalog · published catalog unavailable',
      local:'Local catalog · published catalog unavailable', bundled:'Bundled catalog · published catalog unavailable'
    }[source];
    // Reveal all counts and collection surfaces in the same browser frame,
    // after the one resolved catalog has populated both booth and archive.
    document.documentElement.dataset.catalogState = source;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
