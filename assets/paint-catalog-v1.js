/* Shared presentation rules; published registry data remains unchanged. */
(() => {
  const nameKey = value => String(value || '').trim().toLowerCase();
  const haileyNames = new Set(['hailey', 'hailey bell', 'wispy', 'nicholas waggoner']);
  const isHailey = name => haileyNames.has(nameKey(name));
  const hasNumber = paint => String(paint?.number ?? '').trim().length > 0;
  const isEndurance = paint => !hasNumber(paint) && (
    nameKey(paint?.classification) === 'endurance' ||
    /endurance/i.test(paint?.driver || '') ||
    /\b(gt3|gt4|gte|gtd|lmp|prototype)\b/i.test(paint?.body || '')
  );
  const numberLabel = paint => hasNumber(paint) ? `#${paint.number}` : isEndurance(paint) ? 'ENDURANCE' : 'TEAM';
  const paintType = paint => {
    if (paint?.schemeId) return paint.bodyModel && paint.liveryTexture ? '3D compatible · texture-matched' : 'Roblox Scheme';
    if (paint?.leagues?.includes('iracing')) return 'iRACING CUSTOM LIVERY';
    return paint?.bodyModel || /^lab-/.test(paint?.slug || '') ? '3D DEMONSTRATION · NO SCHEME ID' : 'NO SCHEME ID';
  };
  const isHistorical = paint => Boolean(paint?.historical || paint?.programStatus === 'closed-archive' || paint?.leagues?.includes('uarl-d2'));
  window.AetherwingPaintCatalog = { isHailey, hasNumber, isEndurance, numberLabel, paintType, isHistorical };
})();
