import { normalizeZoom } from './scene.js';

const STORAGE_KEY = 'teacherboard.v2';
const LEGACY_KEY = 'teacherboard.v1';
const MIGRATION_FLAG = 'teacherboard.v2.migratedFromV1';
const BACKGROUNDS = new Set(['clean','grid','lines','coords']);
const STROKE_TOOLS = new Set(['pen','marker','eraser']);
const OBJECT_KINDS = new Set(['shape','graph','text','image']);
const SHAPE_TYPES = new Set(['segment','line','arrow','rect','ellipse','triangle','rightTriangle','parallelogram','trapezoid','rhombus','angle','arc','circleArc','axes','numberLine','xyTable','curtain']);
const INSTRUMENT_TYPES = new Set(['ruler','protractor','compass']);
const TOOLS = new Set(['select','pen','marker','eraser']);
const LEGACY_NUMBER_LINES = {
  number5: { numberMin: -5, numberMax: 5, showLabels: true },
  number10: { numberMin: -10, numberMax: 10, showLabels: true },
  numberBlank: { numberMin: -5, numberMax: 5, showLabels: false }
};

function id(prefix = 'm') {
  return crypto.randomUUID?.() || `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max,fallback=min)=>Math.max(min,Math.min(max,finite(value,fallback)));

function normalizeNumberLine(copy){
  const alias=LEGACY_NUMBER_LINES[copy.shape];
  if(alias){
    copy.shape='numberLine';
    copy.numberMin=alias.numberMin;
    copy.numberMax=alias.numberMax;
    copy.showLabels=alias.showLabels;
  }
  if(copy.shape!=='numberLine')return;
  let min=finite(copy.numberMin,-5),max=finite(copy.numberMax,5);
  if(!(min<max)){min=-5;max=5;}
  if(max-min>40)max=min+40;
  copy.numberMin=min;
  copy.numberMax=max;
  copy.showLabels=copy.showLabels!==false;
}

function normalizeObject(obj) {
  if (!obj || typeof obj !== 'object' || !OBJECT_KINDS.has(obj.kind)) return null;
  const copy = { ...obj };
  copy.id = String(copy.id || id(copy.kind || 'o'));
  copy.x = finite(copy.x, 0);
  copy.y = finite(copy.y, 0);
  copy.w = Math.max(20, finite(copy.w, copy.kind === 'graph' ? 760 : 160));
  copy.h = Math.max(20, finite(copy.h, copy.kind === 'graph' ? 560 : 100));
  copy.rotation = finite(copy.rotation, 0);

  if (copy.kind === 'shape') {
    normalizeNumberLine(copy);
    if (!SHAPE_TYPES.has(copy.shape)) return null;
    copy.color = typeof copy.color === 'string' ? copy.color : '#245d55';
    copy.lineWidth = clamp(copy.lineWidth,1,40,4);
  } else if (copy.kind === 'graph') {
    copy.expression = typeof copy.expression === 'string' && copy.expression.trim() ? copy.expression : 'x';
    copy.color = typeof copy.color === 'string' ? copy.color : '#245d55';
    copy.xMin = finite(copy.xMin,-10); copy.xMax = finite(copy.xMax,10);
    copy.yMin = finite(copy.yMin,-10); copy.yMax = finite(copy.yMax,10);
    if (!(copy.xMin < copy.xMax)) { copy.xMin=-10; copy.xMax=10; }
    if (!(copy.yMin < copy.yMax)) { copy.yMin=-10; copy.yMax=10; }
    copy.majorStep = Math.max(.1,finite(copy.majorStep,1));
  } else if (copy.kind === 'text') {
    copy.text = String(copy.text ?? 'Текст');
    copy.color = typeof copy.color === 'string' ? copy.color : '#245d55';
    copy.fontSize = clamp(copy.fontSize,12,160,32);
  } else if (copy.kind === 'image') {
    if (typeof copy.src !== 'string' || !copy.src.startsWith('data:image/')) return null;
    copy.locked = Boolean(copy.locked || copy.legacyRaster);
    copy.legacyRaster = Boolean(copy.legacyRaster);
  }
  return copy;
}

function normalizeStroke(stroke){
  if(!stroke||typeof stroke!=='object'||!STROKE_TOOLS.has(stroke.tool)||!Array.isArray(stroke.points))return null;
  const points=stroke.points.map(point=>{
    if(!point||typeof point!=='object')return null;
    const x=Number(point.x),y=Number(point.y);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  }).filter(Boolean);
  if(!points.length)return null;
  return {
    ...stroke,
    id:String(stroke.id||id('stroke')),
    tool:stroke.tool,
    color:typeof stroke.color==='string'?stroke.color:'#245d55',
    width:clamp(stroke.width,1,40,4),
    points
  };
}

function normalizeInstrument(item){
  if(!item||typeof item!=='object'||!INSTRUMENT_TYPES.has(item.type))return null;
  const base={...item,id:String(item.id||id(item.type)),x:finite(item.x,520),y:finite(item.y,290),rotation:finite(item.rotation,0)};
  if(item.type==='ruler')return {...base,w:Math.max(260,finite(item.w,520)),h:Math.max(72,finite(item.h,96))};
  if(item.type==='protractor')return {...base,w:Math.max(180,finite(item.w,420)),h:Math.max(140,finite(item.h,220)),angle:clamp(item.angle,0,180,60)};
  const w=Math.max(180,finite(item.w,260)),h=Math.max(140,finite(item.h,300)),maxRadius=Math.max(45,Math.min(w,h)*.45);
  return {...base,w,h,radius:clamp(item.radius,30,maxRadius,92),mode:item.mode==='arc'?'arc':'circle',arcStart:finite(item.arcStart,0),arcEnd:finite(item.arcEnd,180)};
}

function normalizePage(page,index){
  const source=page&&typeof page==='object'?page:{};
  return {
    id:String(source.id||id('page')),
    name:String(source.name||`Сторінка ${index+1}`).slice(0,80),
    background:BACKGROUNDS.has(source.background)?source.background:'clean',
    strokes:(Array.isArray(source.strokes)?source.strokes:[]).map(normalizeStroke).filter(Boolean),
    objects:(Array.isArray(source.objects)?source.objects:[]).map(normalizeObject).filter(Boolean),
    instruments:(Array.isArray(source.instruments)?source.instruments:[]).map(normalizeInstrument).filter(Boolean)
  };
}

export function normalizeStoredState(data,fallback){
  if(!data||typeof data!=='object'||!Array.isArray(data.pages)||!data.pages.length)return null;
  const pages=data.pages.map(normalizePage);
  const activePage=Math.max(0,Math.min(Math.trunc(finite(data.activePage,0)),pages.length-1));
  const rawTool=typeof data.tool==='string'?data.tool:'select';
  const tool=TOOLS.has(rawTool)?rawTool:'select';
  return {
    ...fallback,
    tool,
    color:typeof data.color==='string'?data.color:(fallback.color||'#245d55'),
    lineWidth:clamp(data.lineWidth,1,40,finite(fallback.lineWidth,4)),
    zoom:normalizeZoom(data.zoom),
    activePage,
    pages,
    gesture:null,
    selection:null,
    history:{undo:[],redo:[]}
  };
}

function migrateLegacyPage(page, index) {
  const objects = [];

  if (Array.isArray(page?.objects)) {
    page.objects.map(normalizeObject).filter(Boolean).forEach(o => objects.push(o));
  }

  if (typeof page?.image === 'string' && page.image.startsWith('data:image/')) {
    objects.unshift({
      id: id('legacyRaster'), kind: 'image', src: page.image,
      name: 'Імпорт зі старої дошки', x: 0, y: 0, w: 1600, h: 900,
      rotation: 0, legacyRaster: true, locked: true
    });
  }

  if (Array.isArray(page?.texts)) {
    page.texts.forEach(t => {
      if (!t || !String(t.text ?? '').trim()) return;
      objects.push({
        id: id('text'), kind: 'text', text: String(t.text),
        x: finite(t.x,220), y: finite(t.y,150),
        w: 420, h: 100, rotation: 0,
        color: t.color || '#245d55', fontSize: 32
      });
    });
  }

  return normalizePage({
    id: page?.id || id('page'),
    name: page?.name || `Сторінка ${index + 1}`,
    background: page?.background || 'clean',
    strokes: Array.isArray(page?.strokes) ? page.strokes : [],
    objects,
    instruments: Array.isArray(page?.instruments) ? page.instruments : []
  },index);
}

function serializedState(state) {
  return JSON.stringify({
    tool: state.tool,
    color: state.color,
    lineWidth: state.lineWidth,
    zoom: state.zoom,
    activePage: state.activePage,
    pages: state.pages
  });
}

function migrationStorageError(error) {
  try {
    window.dispatchEvent(new CustomEvent('teacherboard:storage-error', { detail: { error, migration: true } }));
  } catch {}
}

function migrateLegacy(fallback) {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return null;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;

  try {
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy.pages) || !legacy.pages.length) return null;

    const migrated = normalizeStoredState({
      ...fallback,
      tool: 'select',
      zoom: 1,
      activePage: Math.max(0, Math.min(finite(legacy.activePage,0), legacy.pages.length - 1)),
      pages: legacy.pages.map(migrateLegacyPage)
    },fallback);
    if(!migrated)return null;

    const nextRaw = serializedState(migrated);

    localStorage.removeItem(LEGACY_KEY);
    try {
      localStorage.setItem(STORAGE_KEY, nextRaw);
      localStorage.setItem(MIGRATION_FLAG, '1');
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      try { localStorage.setItem(LEGACY_KEY, raw); } catch {}
      migrationStorageError(error);
      throw error;
    }

    return migrated;
  } catch {
    return null;
  }
}

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const normalized=normalizeStoredState(data,fallback);
      if(normalized)return normalized;
    }
  } catch {}

  return migrateLegacy(fallback) || fallback;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, serializedState(state));
    return true;
  } catch (error) {
    try {
      window.dispatchEvent(new CustomEvent('teacherboard:storage-error', { detail: { error, migration: false } }));
    } catch {}
    return false;
  }
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}
