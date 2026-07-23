const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uniq = (items) => [...new Set(items.filter(Boolean))];

const STORAGE = {
  mood: 'anpai-mood-v4', occasion: 'anpai-occasion-v4', range: 'anpai-range-v5',
  interests: 'anpai-interests-v4', favorites: 'anpai-favorites-v4', location: 'anpai-location-v4'
};

const moodCopy = {
  food: { label: '吃', search: '附近餐厅', empty: '附近餐厅' },
  drink: { label: '喝', search: '附近咖啡酒吧', empty: '附近咖啡馆' },
  play: { label: '玩', search: '附近展览公园电影', empty: '附近好去处' }
};

const categories = {
  food: { label: '餐厅', feature: '正经吃饭' }, sweet: { label: '甜点', feature: '甜点饮品' },
  cafe: { label: '咖啡茶饮', feature: '坐下聊聊' }, night: { label: '小酌', feature: '晚上小聚' },
  culture: { label: '展馆', feature: '有内容可看' }, park: { label: '公园', feature: '可以走走' },
  activity: { label: '活动', feature: '有事可做' }, shop: { label: '逛店', feature: '随手逛逛' }
};

const scenarioMatrix = {
  food: {
    business: { title: '商务饭局', primary: '请客稳妥', positive: ['包间','商务','宴请','粤菜','西餐','酒店','私房菜','本帮','海鲜','江浙','淮扬','日料','铁板烧'], negative: ['小吃','快餐','排队','网红','火锅','烧烤','烤肉','面馆','麻辣烫','大排档','茶餐厅','馒头','包子','饺子','小笼','简餐'], weights: { food: 8, cafe: -6, sweet: -10 }, searches: ['restaurant','chinese restaurant','japanese restaurant','western restaurant'] },
    friends: { title: '朋友饭局', primary: '好吃热闹', positive: ['火锅','烧烤','烤肉','川菜','湘菜','串串','小馆','居酒屋','小龙虾','烤鱼'], negative: ['会议','酒店大堂','商务宴请','会所'], weights: { food: 8, sweet: -5 }, searches: ['restaurant','hotpot','barbecue','food'] },
    date: { title: '约会吃饭', primary: '约会不尴尬', positive: ['氛围','露台','花园','设计','西餐','日料','bistro','甜品','小酒馆','创意菜'], negative: ['快餐','大排档','油烟','拼桌','团建','宴请'], weights: { food: 8, sweet: 5, cafe: 2 }, searches: ['restaurant','bistro','japanese restaurant','dessert'] },
    solo: { title: '自己吃饭', primary: '一个人舒服', positive: ['简餐','面馆','轻食','吧台','咖啡','小馆','拉面','粉面'], negative: ['包间','宴请','大桌','团建','KTV'], weights: { food: 8, cafe: 3, sweet: -5 }, searches: ['restaurant','noodle','fast food','cafe'] }
  },
  drink: {
    business: { title: '商务会谈', primary: '安静好谈', positive: ['商务','安静','会议','酒店','大堂','茶空间','茶馆','手冲','包间','精品咖啡'], negative: ['奶茶','夜店','热闹','网红','酒吧','清吧','精酿'], weights: { cafe: 10, night: -12, sweet: -5 }, searches: ['cafe','coffee','tea house','hotel cafe'] },
    friends: { title: '朋友小聚', primary: '朋友小聚', positive: ['清吧','酒吧','精酿','小酒馆','居酒屋','奶茶','茶饮','热闹'], negative: ['会议','商务','酒店大堂'], weights: { night: 9, cafe: 7, sweet: 4 }, searches: ['bar','pub','cafe','tea'] },
    date: { title: '约会喝点', primary: '有氛围', positive: ['清吧','鸡尾酒','甜品','咖啡','花园','露台','设计','好看'], negative: ['夜店','蹦迪','快餐'], weights: { cafe: 9, night: 7, sweet: 6 }, searches: ['cocktail bar','cafe','dessert','coffee'] },
    solo: { title: '自己坐会儿', primary: '可久坐', positive: ['独立咖啡','安静','手冲','阅读','茶馆','空间','精品咖啡'], negative: ['夜店','KTV','蹦迪','热闹','团建','拼桌'], weights: { cafe: 11, night: -12, sweet: 1 }, searches: ['cafe','coffee','tea house','book cafe'] }
  },
  play: {
    business: { title: '商务接待', primary: '稳妥不尴尬', positive: ['美术馆','博物馆','展览','画廊','艺术中心','剧院','公园','滨江','文化'], negative: ['书店','密室','KTV','夜店','电玩城','团建','商场','购物','市集','酒吧'], weights: { culture: 12, park: 7, activity: -3, shop: -12, night: -14 }, searches: ['museum','gallery','theatre','park'] },
    friends: { title: '朋友玩乐', primary: '一起更好玩', positive: ['密室','桌游','KTV','运动','攀岩','保龄球','livehouse','市集','电玩城'], negative: ['商务','会议'], weights: { activity: 12, night: 6, culture: 3, shop: 4, park: 1 }, searches: ['cinema','bowling','sports centre','theatre'] },
    date: { title: '约会玩乐', primary: '有话题', positive: ['展览','电影','公园','书店','美术馆','花园','市集','拍照'], negative: ['团建','夜店','拼桌'], weights: { culture: 10, park: 8, activity: 7, shop: 5, night: -8 }, searches: ['gallery','cinema','park','museum'] },
    solo: { title: '自己逛逛', primary: '自己也自在', positive: ['书店','美术馆','博物馆','公园','电影','展览','阅读','散步'], negative: ['KTV','密室','团建','拼桌','夜店'], weights: { culture: 10, park: 9, shop: 7, activity: 3, night: -10 }, searches: ['museum','gallery','park','cinema'] }
  }
};

const interests = {
  food: [
    ['sichuan','川菜',['川菜','四川','麻辣','串串','sichuan']], ['hotpot','火锅',['火锅','涮','hotpot']],
    ['bbq','烧烤',['烧烤','烤肉','炭火','barbecue','bbq']], ['noodles','面馆',['面馆','拉面','米线','noodle']],
    ['japanese','日料',['日料','寿司','居酒屋','拉面','japanese','sushi']], ['korean','韩餐',['韩餐','韩国','烤肉','korean']],
    ['western','西餐',['西餐','牛排','披萨','意面','bistro','western']], ['cantonese','粤菜',['粤菜','广东','港式','早茶','cantonese']],
    ['southeastAsian','东南亚',['东南亚','泰式','越南','咖喱','thai','vietnamese']], ['dimsum','点心',['点心','早茶','dim sum']],
    ['snack','小吃',['小吃','炸','馄饨','生煎','snack']], ['vegetarian','素食',['素食','蔬食','轻食','vegetarian']]
  ],
  drink: [
    ['coffee','咖啡',['咖啡','coffee','cafe']], ['tea','奶茶',['茶','奶茶','果茶','tea']],
    ['dessert','下午茶',['甜品','蛋糕','面包','烘焙','dessert','bakery']], ['bar','小酌',['酒吧','清吧','精酿','啤酒','bar','pub']]
  ],
  play: [
    ['movie','电影',['电影','影院','cinema']], ['exhibition','展览',['展览','美术馆','博物馆','画廊','museum','gallery']],
    ['bookstore','书店',['书店','图书','book']], ['park','公园',['公园','绿地','滨江','park']],
    ['shopping','逛店',['商场','购物','百货','mall']], ['game','游戏',['桌游','密室','电玩城','game']],
    ['sports','运动',['运动','攀岩','保龄球','sports','bowling']], ['market','市集',['市集','夜市','market']],
    ['live','演出',['演出','live','音乐','剧场','theatre']], ['spa','放松',['按摩','spa','足疗']], ['ktv','唱歌',['KTV','唱歌','karaoke']]
  ],
  vibe: [
    ['quiet','安静点',['安静','书店','公园','咖啡','茶','美术馆']], ['photogenic','好看',['拍照','露台','花园','设计','艺术','甜品']],
    ['budget','不贵',['小吃','面','快餐','简餐','公园']], ['indoor','室内',['商场','影院','美术馆','博物馆','书店','咖啡','餐厅']],
    ['walking','能走走',['公园','街区','市集','景点','书店']], ['fresh','新鲜',['新店','展','艺术','市集','体验']],
    ['lively','热闹',['酒吧','商场','影院','烧烤','火锅','市集']], ['chat','聊天',['咖啡','茶','酒吧','公园','书店']],
    ['rainy','雨天',['商场','影院','美术馆','博物馆','书店','咖啡']]
  ]
};
const interestLookup = new Map(Object.values(interests).flat().map(([id, label, keywords]) => [id, { id, label, keywords }]));
const interestSearchQueries = {
  sichuan: ['sichuan restaurant'], hotpot: ['hotpot'], bbq: ['barbecue'], noodles: ['noodle restaurant'],
  japanese: ['japanese restaurant','sushi'], korean: ['korean restaurant'], western: ['western restaurant','bistro'],
  cantonese: ['cantonese restaurant','dim sum'], southeastAsian: ['thai restaurant','vietnamese restaurant'], dimsum: ['dim sum'],
  snack: ['fast food'], vegetarian: ['vegetarian restaurant'], coffee: ['cafe','coffee'], tea: ['tea house'],
  dessert: ['dessert','bakery'], bar: ['bar','pub'], movie: ['cinema'], exhibition: ['museum','gallery'],
  bookstore: ['bookstore'], park: ['park'], shopping: ['shopping mall'], game: ['game centre'], sports: ['sports centre','bowling'],
  market: ['market'], live: ['theatre','music venue'], spa: ['spa'], ktv: ['karaoke']
};
const interestCategoryCompat = {
  sichuan: ['food'], hotpot: ['food'], bbq: ['food'], noodles: ['food'], japanese: ['food'], korean: ['food'],
  western: ['food'], cantonese: ['food'], southeastAsian: ['food'], dimsum: ['food'], snack: ['food'], vegetarian: ['food'],
  coffee: ['cafe'], tea: ['cafe','sweet'], dessert: ['sweet','cafe'], bar: ['night'], movie: ['activity'],
  exhibition: ['culture'], bookstore: ['shop'], park: ['park'], shopping: ['shop'], game: ['activity'], sports: ['activity'],
  market: ['shop','activity'], live: ['culture','activity'], spa: ['activity'], ktv: ['activity','night']
};

const overpassFilters = {
  food: ['["amenity"~"restaurant|fast_food|food_court"]'],
  drink: ['["amenity"~"cafe|bar|pub|biergarten|ice_cream"]', '["shop"~"bakery|confectionery|tea|coffee"]'],
  play: ['["tourism"~"museum|gallery|attraction"]', '["leisure"~"park|sports_centre|bowling_alley|fitness_centre"]', '["amenity"~"cinema|theatre|arts_centre|nightclub"]', '["shop"~"books|mall|department_store"]']
};
const overpassEndpoints = [
  'https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter', 'https://overpass.nchc.org.tw/api/interpreter'
];
const rangeMeters = { km1: 1000, km3: 3000, km5: 5000, more: 15000 };
const rangeLabels = { km1: '1km内', km3: '3km内', km5: '5km内', more: '15km内' };

function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}

const legacyFavorites = readJSON('anpai-favorites-v3', []);
const storedRange = localStorage.getItem(STORAGE.range) || localStorage.getItem('anpai-range-v4');
const migratedRange = ({ near: 'km1', comfortable: 'km3', explore: 'km5' })[storedRange] || storedRange;
const state = {
  mood: localStorage.getItem(STORAGE.mood) || localStorage.getItem('anpai-mood-v3') || 'food',
  occasion: localStorage.getItem(STORAGE.occasion) || localStorage.getItem('anpai-occasion-v3') || 'friends',
  range: rangeMeters[migratedRange] ? migratedRange : 'km3',
  selectedInterests: new Set(readJSON(STORAGE.interests, [])),
  coords: null, rawPlaces: [], places: [], index: 0, request: null, locating: false,
  favorites: readJSON(STORAGE.favorites, legacyFavorites), activeDetail: null, preferencesDirty: false,
  metadataLoading: false, errorAction: 'retry'
};
let toastTimer;

function currentScenario() { return scenarioMatrix[state.mood][state.occasion]; }
function currentPlace() { return state.places[state.index % Math.max(1, state.places.length)]; }

function setPanel(name) {
  ['start', 'loading', 'result', 'error'].forEach((panel) => $(`#${panel}Panel`).classList.toggle('hidden', panel !== name));
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 1900);
}

function distanceText(meters) {
  if (!Number.isFinite(meters)) return '';
  const minutes = Math.max(1, Math.round(meters / 78));
  return minutes <= 45 ? `步行约 ${minutes} 分钟` : `约 ${(meters / 1000).toFixed(1)} 公里`;
}

function distanceMeters(a, b) {
  const rad = (number) => number * Math.PI / 180;
  const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function relevantInterestIds() {
  const moodIds = new Set([...interests[state.mood === 'food' ? 'food' : state.mood === 'drink' ? 'drink' : 'play'], ...interests.vibe].map(([id]) => id));
  return [...state.selectedInterests].filter((id) => moodIds.has(id)).sort();
}

function selectedMoodInterestIds() {
  const group = state.mood === 'food' ? 'food' : state.mood === 'drink' ? 'drink' : 'play';
  const ids = new Set(interests[group].map(([id]) => id));
  return [...state.selectedInterests].filter((id) => ids.has(id));
}

function selectedVibeInterestIds() {
  const ids = new Set(interests.vibe.map(([id]) => id));
  return [...state.selectedInterests].filter((id) => ids.has(id));
}

function filterSummaryText() {
  const labels = relevantInterestIds().map((id) => interestLookup.get(id)?.label).filter(Boolean);
  return [rangeLabels[state.range], ...labels].join(' · ');
}

function renderFilterSummary() {
  $('#filterSummaryText').textContent = filterSummaryText();
  $('#filterSummary').classList.toggle('has-preferences', relevantInterestIds().length > 0);
}

function cacheKey() {
  if (!state.coords) return '';
  return `${state.mood}:${state.occasion}:${state.coords.lat.toFixed(2)}:${state.coords.lon.toFixed(2)}:${relevantInterestIds().join('-')}`;
}

function readCachedPlaces() {
  try {
    const cached = JSON.parse(localStorage.getItem(`anpai-result-v6:${cacheKey()}`));
    return cached && Date.now() - cached.savedAt < 7 * 24 * 60 * 60 * 1000 ? cached.places : [];
  } catch { return []; }
}

function writeCachedPlaces(places) {
  try { localStorage.setItem(`anpai-result-v6:${cacheKey()}`, JSON.stringify({ savedAt: Date.now(), places })); } catch { /* storage can be unavailable */ }
}

function updateFavoriteCount() {
  const count = state.favorites.length;
  $('#favoriteCount').textContent = String(count);
  $('#favoriteCount').classList.toggle('hidden', count === 0);
}

function setLocation(coords, label = '位置已获取') {
  state.coords = { lat: Number(coords.latitude ?? coords.lat), lon: Number(coords.longitude ?? coords.lon) };
  $('#locationText').textContent = label;
  $('#locationButton').classList.add('ready');
  try { localStorage.setItem(STORAGE.location, JSON.stringify({ ...state.coords, savedAt: Date.now() })); } catch { /* private mode */ }
  updateMapSearch();
}

function updateMapSearch() {
  if (!state.coords) return;
  const query = encodeURIComponent(moodCopy[state.mood].search);
  $('#mapSearchButton').href = `https://uri.amap.com/search?keyword=${query}&center=${state.coords.lon},${state.coords.lat}`;
}

function timedSignal(ms, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, ms);
  parentSignal?.addEventListener('abort', abort, { once: true });
  return { signal: controller.signal, done: () => { clearTimeout(timer); parentSignal?.removeEventListener('abort', abort); } };
}

function safeURL(value) {
  if (!value) return '';
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

function imageURL(tags) {
  const direct = safeURL(tags.image || tags['contact:image']);
  if (direct) return direct;
  const commons = tags.wikimedia_commons || '';
  if (/^(File|文件):/i.test(commons)) {
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(commons.replace(/^(File|文件):/i, ''))}`;
  }
  return '';
}

function normalizedOsmType(value = '') {
  const type = String(value).toLowerCase();
  return ({ n: 'node', w: 'way', r: 'relation' })[type] || (['node','way','relation'].includes(type) ? type : '');
}

function categoryFromTags(tags, fallbackMood) {
  const amenity = String(tags.amenity || '').toLowerCase();
  const tourism = String(tags.tourism || '').toLowerCase();
  const leisure = String(tags.leisure || '').toLowerCase();
  const shop = String(tags.shop || '').toLowerCase();
  if (['restaurant','fast_food','food_court'].includes(amenity)) return 'food';
  if (['cafe'].includes(amenity) || ['tea','coffee'].includes(shop)) return 'cafe';
  if (['bar','pub','biergarten','nightclub'].includes(amenity)) return 'night';
  if (amenity === 'ice_cream' || ['bakery','confectionery'].includes(shop)) return 'sweet';
  if (['museum','gallery'].includes(tourism) || ['theatre','arts_centre'].includes(amenity)) return 'culture';
  if (leisure === 'park') return 'park';
  if (['cinema'].includes(amenity) || ['sports_centre','bowling_alley','fitness_centre'].includes(leisure)) return 'activity';
  if (['books','mall','department_store'].includes(shop)) return 'shop';
  return fallbackMood === 'food' ? 'food' : fallbackMood === 'drink' ? 'cafe' : 'activity';
}

function featureFromTags(tags, category) {
  const values = [tags.amenity, tags.tourism, tags.leisure, tags.shop].filter(Boolean);
  const map = {
    restaurant: '餐厅', fast_food: '简餐', food_court: '美食广场', cafe: '咖啡馆', bar: '酒吧', pub: '小酌', biergarten: '精酿', nightclub: '夜生活',
    ice_cream: '甜品', bakery: '烘焙', confectionery: '甜点', museum: '博物馆', gallery: '美术馆', attraction: '景点',
    park: '公园', cinema: '电影院', theatre: '剧场', arts_centre: '艺术中心', sports_centre: '运动', bowling_alley: '保龄球', fitness_centre: '运动',
    books: '书店', mall: '商场', department_store: '百货'
  };
  return values.map((value) => map[value]).find(Boolean) || categories[category].label;
}

function normalizePlaces(elements, origin, mood) {
  const seen = new Set();
  return elements.map((item) => {
    const lat = Number(item.lat ?? item.center?.lat); const lon = Number(item.lon ?? item.center?.lon);
    const tags = item.tags || {}; const name = String(tags.name || '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const signature = `${name.toLowerCase()}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    if (seen.has(signature)) return null; seen.add(signature);
    const category = categoryFromTags(tags, mood);
    const allowed = mood === 'food' ? ['food','sweet','cafe'] : mood === 'drink' ? ['cafe','night','sweet'] : ['culture','park','activity','shop','night'];
    if (!allowed.includes(category)) return null;
    const distance = Math.round(distanceMeters(origin, { lat, lon }));
    if (distance > 15000) return null;
    const address = tags.address || [tags['addr:district'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const phone = tags.phone || tags['contact:phone'] || '';
    const website = safeURL(tags.website || tags['contact:website']);
    const ratingValue = Number(tags.rating || tags.stars);
    const averageCost = String(tags.average_cost || tags['average_cost:person'] || '').replace(/[^0-9.]/g, '');
    const evidence = uniq([
      ...String(tags.cuisine || '').split(/[;,]/).map((part) => part.trim()),
      tags.brand, tags.outdoor_seating === 'yes' ? '露台' : '', tags.wheelchair === 'yes' ? '无障碍' : '',
      tags.internet_access === 'wlan' ? '有 Wi-Fi' : ''
    ]).slice(0, 5);
    return {
      id: `${item.type || 'place'}-${item.id || `${lat}-${lon}`}`, name, lat, lon, distance, category,
      feature: featureFromTags(tags, category), image: imageURL(tags), address, phone, website,
      openingHours: tags.opening_hours || '', cuisine: tags.cuisine || '', rating: ratingValue > 0 && ratingValue <= 5 ? ratingValue : null,
      averageCost: averageCost ? Number(averageCost) : null, evidence, source: 'OpenStreetMap',
      osmId: String(item.osmId || item.id || ''), osmType: normalizedOsmType(item.osmType || item.type),
      wikidata: tags.wikidata || '', wikipedia: tags.wikipedia || '', wikimediaCommons: tags.wikimedia_commons || '',
      searchIntentIds: item.searchIntentIds || [], metadataLoaded: item.type !== 'photon'
    };
  }).filter(Boolean);
}

async function fetchOverpassDirect(lat, lon, mood, parentSignal) {
  const clauses = overpassFilters[mood].map((filter) => `nwr(around:5200,${lat},${lon})${filter};`).join('');
  const query = `[out:json][timeout:12];(${clauses});out center tags 120;`;
  const request = async (endpoint) => {
    const timeout = timedSignal(9500, parentSignal);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: new URLSearchParams({ data: query }), signal: timeout.signal });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const payload = await response.json();
      if (!payload.elements?.length) throw new Error('No Overpass places');
      return payload.elements;
    } finally { timeout.done(); }
  };
  try { return await Promise.any(overpassEndpoints.slice(0, 2).map(request)); }
  catch { return Promise.any(overpassEndpoints.slice(2).map(request)); }
}

function photonQueries() {
  const queries = [...currentScenario().searches];
  relevantInterestIds().slice(0, 2).forEach((id) => {
    queries.unshift(...(interestSearchQueries[id] || []));
  });
  return uniq(queries).slice(0, 6);
}

function interestIdsForSearchQuery(query) {
  const active = new Set(relevantInterestIds());
  return Object.entries(interestSearchQueries)
    .filter(([id, queries]) => active.has(id) && queries.includes(query))
    .map(([id]) => id);
}

async function fetchPhotonDirect(lat, lon, mood, parentSignal) {
  const request = async (query) => {
    const params = new URLSearchParams({ q: query, lat, lon, limit: '20' });
    const timeout = timedSignal(6500, parentSignal);
    try {
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: timeout.signal });
      if (!response.ok) throw new Error(`Photon ${response.status}`);
      const payload = await response.json();
      const searchIntentIds = interestIdsForSearchQuery(query);
      return (payload.features || []).map((feature) => ({ ...feature, searchIntentIds }));
    } finally { timeout.done(); }
  };
  const batches = await Promise.allSettled(photonQueries().map(request));
  return batches.flatMap((batch) => batch.status === 'fulfilled' ? batch.value : []).map((item) => {
    const p = item.properties || {};
    if (!p.name || !p.osm_key || !p.osm_value) return null;
    return {
      type: 'photon', id: p.osm_id || `${item.geometry?.coordinates?.[0]}-${item.geometry?.coordinates?.[1]}`,
      osmId: p.osm_id, osmType: p.osm_type,
      searchIntentIds: item.searchIntentIds || [],
      lat: Number(item.geometry?.coordinates?.[1]), lon: Number(item.geometry?.coordinates?.[0]),
      tags: { name: p.name, [p.osm_key]: p.osm_value, address: [p.district, p.street, p.housenumber, p.city].filter(Boolean).join(' '), website: p.website, phone: p.phone }
    };
  }).filter(Boolean);
}

async function fetchNominatimDirect(lat, lon, mood, parentSignal) {
  const delta = .05;
  const selected = relevantInterestIds().map((id) => interestLookup.get(id)?.label).filter(Boolean)[0];
  const params = new URLSearchParams({ format: 'jsonv2', q: selected || moodCopy[mood].empty, viewbox: `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`, bounded: '1', limit: '35', addressdetails: '1', extratags: '1', 'accept-language': 'zh-CN,zh,en' });
  const timeout = timedSignal(8500, parentSignal);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: timeout.signal });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const results = await response.json();
    if (!results.length) throw new Error('No Nominatim places');
    return results.map((item) => ({ type: 'nominatim', id: item.osm_id || item.place_id, osmId: item.osm_id, osmType: item.osm_type, lat: Number(item.lat), lon: Number(item.lon), tags: { ...(item.extratags || {}), name: item.display_name?.split(',')[0], [item.class || 'amenity']: item.type, address: item.display_name } }));
  } finally { timeout.done(); }
}

function enrichPlaceFromTags(place, tags = {}) {
  const category = categoryFromTags(tags, state.mood);
  const address = tags.address || [tags['addr:city'], tags['addr:district'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const ratingValue = Number(tags.rating || tags.stars);
  const averageCost = String(tags.average_cost || tags['average_cost:person'] || '').replace(/[^0-9.]/g, '');
  const evidence = uniq([
    ...(place.evidence || []), ...String(tags.cuisine || '').split(/[;,]/).map((part) => part.trim()),
    tags.brand, tags.outdoor_seating === 'yes' ? '露台' : '', tags.wheelchair === 'yes' ? '无障碍' : '',
    tags.internet_access === 'wlan' ? '有 Wi-Fi' : ''
  ]).slice(0, 6);
  return {
    ...place, category, feature: featureFromTags(tags, category), image: imageURL(tags) || place.image,
    address: address || place.address, phone: tags.phone || tags['contact:phone'] || place.phone,
    website: safeURL(tags.website || tags['contact:website']) || place.website,
    openingHours: tags.opening_hours || place.openingHours, cuisine: tags.cuisine || place.cuisine,
    rating: ratingValue > 0 && ratingValue <= 5 ? ratingValue : place.rating,
    averageCost: averageCost ? Number(averageCost) : place.averageCost, evidence,
    wikidata: tags.wikidata || place.wikidata, wikipedia: tags.wikipedia || place.wikipedia,
    wikimediaCommons: tags.wikimedia_commons || place.wikimediaCommons, metadataLoaded: true
  };
}

async function fetchOsmMetadata(places, signal) {
  const targets = places.filter((place) => !place.metadataLoaded && place.osmId && place.osmType);
  if (!targets.length) return places;
  const details = new Map();
  const groups = ['node','way','relation'].map((type) => [type, uniq(targets.filter((place) => place.osmType === type).map((place) => place.osmId)).slice(0, 80)]).filter(([, ids]) => ids.length);
  await Promise.allSettled(groups.map(async ([type, ids]) => {
    const plural = `${type}s`;
    const response = await fetch(`https://api.openstreetmap.org/api/0.6/${plural}.json?${plural}=${ids.join(',')}`, { signal });
    if (!response.ok) throw new Error(`OSM metadata ${response.status}`);
    const payload = await response.json();
    (payload.elements || []).forEach((element) => details.set(`${type}:${element.id}`, element.tags || {}));
  }));
  return places.map((place) => {
    const tags = details.get(`${place.osmType}:${place.osmId}`);
    return tags ? enrichPlaceFromTags(place, tags) : { ...place, metadataLoaded: true };
  });
}

async function fetchWikidataImage(qid, signal) {
  if (!/^Q\d+$/.test(qid || '')) return '';
  const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal });
  if (!response.ok) return '';
  const entity = (await response.json()).entities?.[qid];
  const filename = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return filename ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=1200` : '';
}

async function fetchWikipediaImage(reference, signal) {
  const match = String(reference || '').match(/^([a-z-]+):(.+)$/i);
  if (!match) return '';
  const response = await fetch(`https://${match[1]}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(match[2])}`, { signal });
  if (!response.ok) return '';
  const payload = await response.json();
  return safeURL(payload.thumbnail?.source || payload.originalimage?.source);
}

async function fetchCommonsImage(reference, signal) {
  const match = String(reference || '').match(/^Category:(.+)$/i);
  if (!match) return '';
  const params = new URLSearchParams({
    action: 'query', generator: 'categorymembers', gcmtitle: `Category:${match[1]}`, gcmtype: 'file',
    gcmlimit: '3', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '1200', format: 'json', origin: '*'
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) return '';
  const pages = Object.values((await response.json()).query?.pages || {});
  return safeURL(pages.map((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url).find(Boolean));
}

async function enrichVerifiedImages(places, signal) {
  const candidates = places.filter((place) => !place.image && (place.wikidata || place.wikipedia || place.wikimediaCommons)).slice(0, 14);
  const images = new Map();
  await Promise.allSettled(candidates.map(async (place) => {
    const image = await fetchWikidataImage(place.wikidata, signal).catch(() => '')
      || await fetchWikipediaImage(place.wikipedia, signal).catch(() => '')
      || await fetchCommonsImage(place.wikimediaCommons, signal).catch(() => '');
    if (image) images.set(place.id, image);
  }));
  return places.map((place) => images.has(place.id) ? { ...place, image: images.get(place.id), imageSource: 'Wikimedia Commons' } : place);
}

async function enrichPlaces(places, signal) {
  const withMetadata = await fetchOsmMetadata(places, signal);
  return enrichVerifiedImages(withMetadata, signal);
}

async function fetchDirectPlaces(signal) {
  const { lat, lon } = state.coords;
  if (relevantInterestIds().length) {
    try {
      const elements = await fetchPhotonDirect(lat, lon, state.mood, signal);
      const filteredSearchPlaces = normalizePlaces(elements, { lat, lon }, state.mood);
      if (filteredSearchPlaces.length) return filteredSearchPlaces;
    } catch (error) { if (error.name === 'AbortError') throw error; }
  }
  const firstWave = [fetchPhotonDirect, fetchOverpassDirect].map(async (loader) => {
    const elements = await loader(lat, lon, state.mood, signal);
    const places = normalizePlaces(elements, { lat, lon }, state.mood);
    if (!places.length) throw new Error('No normalized places');
    return places;
  });
  try { return await Promise.any(firstWave); }
  catch {
    const elements = await fetchNominatimDirect(lat, lon, state.mood, signal);
    const places = normalizePlaces(elements, { lat, lon }, state.mood);
    if (!places.length) throw new Error('No nearby places');
    return places;
  }
}

async function fetchNearbyPlaces(signal) {
  const isStatic = location.hostname.endsWith('.github.io') || location.protocol === 'file:';
  if (!isStatic) {
    try {
      const params = new URLSearchParams({ lat: state.coords.lat, lon: state.coords.lon, mood: state.mood });
      const response = await fetch(`/api/nearby?${params}`, { signal });
      if (!response.ok) throw new Error('Nearby server unavailable');
      const data = await response.json();
      if (!data.places?.length) throw new Error('No server places');
      return data.places;
    } catch (error) { if (error.name === 'AbortError') throw error; }
  }
  return fetchDirectPlaces(signal);
}

function placeText(place) {
  return [place.name, place.feature, place.category, place.cuisine, ...(place.evidence || [])].join(' ').toLowerCase();
}

function matchesAny(text, words) { return words.filter((word) => text.includes(String(word).toLowerCase())); }

function stableOccasionBias(place, occasion) {
  const value = `${occasion}:${place.id}:${place.name}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash % 18);
}

function matchesInterest(place, id) {
  if (place.searchIntentIds?.includes(id) && (interestCategoryCompat[id] || []).includes(place.category)) return true;
  const text = placeText(place);
  const direct = matchesAny(text, interestLookup.get(id)?.keywords || []).length > 0;
  if (direct) return true;
  switch (id) {
    case 'quiet': return ['cafe','culture','park'].includes(place.category) && !matchesAny(text, ['夜店','酒吧','ktv','电玩城']).length;
    case 'photogenic': return Boolean(place.image) || ['culture','park'].includes(place.category);
    case 'budget': return (place.averageCost && place.averageCost <= 100) || matchesAny(text, ['简餐','快餐','小吃','面馆','公园']).length > 0;
    case 'indoor': return !['park'].includes(place.category);
    case 'walking': return ['park','culture','shop'].includes(place.category);
    case 'fresh': return ['culture'].includes(place.category);
    case 'lively': return ['night','activity','shop'].includes(place.category);
    case 'chat': return ['cafe','night','park'].includes(place.category);
    case 'rainy': return !['park'].includes(place.category);
    default: return false;
  }
}

function filterEmptyMessage() {
  const labels = relevantInterestIds().map((id) => interestLookup.get(id)?.label).filter(Boolean);
  const preference = labels.length ? `并符合“${labels.join('、')}”` : '';
  return `${rangeLabels[state.range]}${preference}的地点暂时没有找到。可以放宽距离或减少偏好。`;
}

function rankPlaces(rawPlaces = state.rawPlaces) {
  const scenario = currentScenario(); const limit = rangeMeters[state.range];
  const moodFilters = selectedMoodInterestIds();
  const vibeFilters = selectedVibeInterestIds();
  const candidates = rawPlaces.filter((place) => {
    if (place.distance > limit) return false;
    if (moodFilters.length && !moodFilters.some((id) => matchesInterest(place, id))) return false;
    if (vibeFilters.length && !vibeFilters.some((id) => matchesInterest(place, id))) return false;
    return true;
  });
  document.documentElement.dataset.rawPlaces = String(rawPlaces.length);
  document.documentElement.dataset.filteredPlaces = String(candidates.length);
  document.documentElement.dataset.distanceLimit = String(limit);
  const ranked = candidates.map((place) => {
    const text = placeText(place);
    const positives = matchesAny(text, scenario.positive); const negatives = matchesAny(text, scenario.negative);
    const matchedInterests = relevantInterestIds().filter((id) => matchesInterest(place, id));
    let score = 100 - Math.min(55, place.distance / 115) + (scenario.weights[place.category] || 0) * 3;
    score += Math.min(30, positives.length * 12) - Math.min(90, negatives.length * 42) + matchedInterests.length * 26;
    score += stableOccasionBias(place, state.occasion);
    score += 18;
    if (place.rating) score += place.rating * 2; if (place.image) score += 3; if (place.evidence?.length) score += 2;
    if (state.mood === 'food' && place.category === 'sweet' && !state.selectedInterests.has('dessert') && state.occasion !== 'date') score -= 80;
    if (state.mood === 'play' && state.occasion === 'business' && ['shop','night','activity'].includes(place.category)) score -= 90;
    if (state.occasion === 'business' && state.mood === 'food' && place.averageCost && place.averageCost < 120) score -= 20;
    if (state.occasion === 'solo' && state.mood === 'food' && place.averageCost && place.averageCost > 160) score -= 15;
    return { ...place, score, positives, matchedInterests };
  }).sort((a, b) => b.score - a.score || a.distance - b.distance);
  state.places = ranked.slice(0, 30); state.index = Math.min(state.index, Math.max(0, state.places.length - 1));
}

function reasonChips(place) {
  if (place.savedChips?.length) return place.savedChips;
  const scenario = currentScenario(); const text = placeText(place);
  const preferenceLabels = (place.matchedInterests || relevantInterestIds().filter((id) => matchesAny(text, interestLookup.get(id)?.keywords || []).length)).map((id) => interestLookup.get(id)?.label);
  const evidence = [
    ...preferenceLabels,
    ...(place.positives || matchesAny(text, scenario.positive)).slice(0, 1),
    ...(place.evidence || []).filter((tag) => tag.length <= 8).slice(0, 1),
    place.feature,
    scenario.primary
  ];
  return uniq(evidence).filter((item) => item && !['吃','喝','玩'].includes(item)).slice(0, 3);
}

function reasonFor(place) { return place.savedReason || reasonChips(place).slice(0, 2).join(' · '); }
function mapUrl(place) { return `https://uri.amap.com/navigation?to=${place.lon},${place.lat},${encodeURIComponent(place.name)}&mode=walk`; }
function appleMapsUrl(place) { return `https://maps.apple.com/?daddr=${place.lat},${place.lon}&q=${encodeURIComponent(place.name)}&dirflg=w`; }
function mapEmbedUrl(place) {
  const lonSpan = .006; const latSpan = .004;
  const bbox = `${place.lon - lonSpan},${place.lat - latSpan},${place.lon + lonSpan},${place.lat + latSpan}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${place.lat}%2C${place.lon}`;
}
function dianpingAppUrl(place) { return `dianping://searchshoplist?keyword=${encodeURIComponent(place.name)}`; }
function currentDianpingKeyword() {
  return relevantInterestIds().map((id) => interestLookup.get(id)?.label).find(Boolean) || moodCopy[state.mood].empty;
}
function dianpingWebUrl(place) {
  if ((place.address || '').includes('上海')) return `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(place.name)}`;
  return 'https://www.dianping.com/';
}
function openAppWithFallback(appUrl, fallback) {
  let leftPage = false;
  const onVisibility = () => { if (document.hidden) leftPage = true; };
  document.addEventListener('visibilitychange', onVisibility, { once: true });
  window.location.href = appUrl;
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (!leftPage) window.location.href = fallback;
  }, 1200);
}
function openDianping(place) { openAppWithFallback(dianpingAppUrl(place), dianpingWebUrl(place)); }
function openDianpingSearch() {
  const keyword = currentDianpingKeyword();
  openAppWithFallback(`dianping://searchshoplist?keyword=${encodeURIComponent(keyword)}`, 'https://www.dianping.com/');
}
function isFavorite(place) { return state.favorites.some((item) => item.id === place.id); }

function renderVisual(place, target = $('#placeVisual')) {
  if (place.image) {
    target.innerHTML = `<img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}的真实地点图片" referrerpolicy="no-referrer" /><span class="visual-note">真实地点图片</span>`;
    target.querySelector('img')?.addEventListener('error', () => { place.image = ''; renderVisual(place, target); }, { once: true });
  } else {
    target.innerHTML = `<iframe title="${escapeHtml(place.name)}位置地图" loading="lazy" src="${escapeHtml(mapEmbedUrl(place))}"></iframe><span class="visual-note">位置地图</span>`;
  }
}

function factChips(place) {
  return uniq([
    distanceText(place.distance), place.rating ? `${place.rating.toFixed(1)} 分` : '',
    place.averageCost ? `约 ¥${Math.round(place.averageCost)}/人` : '', place.feature
  ]).filter(Boolean);
}

function showError(title, message, action = 'retry') {
  state.errorAction = action;
  $('#errorTitle').textContent = title;
  $('#errorText').textContent = message;
  $('#retryButton').textContent = action === 'filters' ? '调整筛选' : '重新推荐';
  setPanel('error');
}

function renderResult() {
  const place = currentPlace();
  renderFilterSummary();
  if (!place) {
    if (state.metadataLoading) return setPanel('loading');
    return showError('没有符合条件的地点', filterEmptyMessage(), 'filters');
  }
  $('#resultKicker').textContent = state.index === 0 ? currentScenario().title : '换一个选择';
  $('#placeName').textContent = place.name;
  $('#reasonChips').innerHTML = reasonChips(place).map((chip) => `<span class="reason-chip">${escapeHtml(chip)}</span>`).join('');
  $('#placeReason').textContent = `${reasonFor(place)}，${distanceText(place.distance)}。`;
  $('#placeFacts').innerHTML = factChips(place).map((fact) => `<span class="fact-chip">${escapeHtml(fact)}</span>`).join('');
  $('#navigateButton').href = mapUrl(place);
  $('#saveButton').classList.toggle('saved', isFavorite(place));
  $('#saveButton').setAttribute('aria-label', isFavorite(place) ? '取消收藏' : '收藏这家');
  $('#recommendation').dataset.distance = String(Math.round(place.distance));
  $('#remainingText').textContent = state.places.length > 1 ? `还有 ${state.places.length - 1} 个选择` : '附近只找到这一个';
  $('#dianpingMoreButton').classList.toggle('hidden', state.places.length >= 3);
  renderVisual(place);

  const alternatives = [1, 2].map((step) => state.places[(state.index + step) % state.places.length]).filter((item, index, all) => item && item.id !== place.id && all.findIndex((other) => other.id === item.id) === index);
  $('#alternatives').innerHTML = alternatives.map((item, index) => `<button class="alternative" data-place-id="${escapeHtml(item.id)}" data-distance="${Math.round(item.distance)}" type="button"><span class="alternative-index">${index + 2}</span><span class="alternative-copy"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(reasonFor(item))}</span></span><span class="alternative-distance">${escapeHtml(distanceText(item.distance))}</span></button>`).join('');
  $$('[data-place-id]').forEach((button) => { button.onclick = () => { const target = state.places.findIndex((item) => item.id === button.dataset.placeId); if (target >= 0) { state.index = target; renderResult(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }; });
  setPanel('result');
}

async function loadPlaces({ force = false } = {}) {
  if (!state.coords) return locate();
  const cached = readCachedPlaces();
  if (cached.length) {
    state.rawPlaces = cached; state.index = 0; rankPlaces(); renderResult();
  } else if (!state.rawPlaces.length) setPanel('loading');
  else { rankPlaces(); renderResult(); }

  state.request?.abort();
  const controller = new AbortController(); state.request = controller;
  try {
    if (!force && cached.length) {
      const needsEnrichment = cached.some((place) => !place.metadataLoaded || (!place.image && (place.wikidata || place.wikipedia)));
      if (!needsEnrichment) return;
      state.metadataLoading = relevantInterestIds().length > 0 && !state.places.length;
      if (state.metadataLoading) setPanel('loading');
      const enrichedCache = await enrichPlaces(cached, controller.signal);
      state.rawPlaces = enrichedCache; state.metadataLoading = false; writeCachedPlaces(enrichedCache); rankPlaces(); renderResult();
      return;
    }

    const places = await fetchNearbyPlaces(controller.signal);
    state.rawPlaces = places; state.index = 0;
    const waitForMetadata = relevantInterestIds().length > 0 && places.some((place) => !place.metadataLoaded);
    state.metadataLoading = waitForMetadata;
    if (waitForMetadata) setPanel('loading');
    else { rankPlaces(); renderResult(); }

    const enriched = await enrichPlaces(places, controller.signal);
    state.rawPlaces = enriched; state.metadataLoading = false; writeCachedPlaces(enriched); rankPlaces(); renderResult();
  } catch (error) {
    if (error.name === 'AbortError') return;
    state.metadataLoading = false;
    if (state.rawPlaces.length) { rankPlaces(); renderResult(); toast('已显示最近一次结果'); }
    else showError('附近地点暂时不可用', '位置已经拿到，地点服务暂时没有返回。你可以重试，或者直接去地图查看。');
  } finally { if (state.request === controller) state.request = null; state.metadataLoading = false; }
}

function locate() {
  if (state.locating) return;
  const testLocation = ['127.0.0.1', 'localhost'].includes(location.hostname) && new URLSearchParams(location.search).has('testLocation');
  if (testLocation) {
    setLocation({ lat: 31.2304, lon: 121.4737 }, '测试位置');
    loadPlaces({ force: true });
    return;
  }
  if (!navigator.geolocation) { showError('无法使用定位', '当前浏览器不支持定位，请直接在地图查看附近地点。'); return; }
  state.locating = true; $('#locationText').textContent = '正在定位';
  if (state.rawPlaces.length) { rankPlaces(); renderResult(); } else setPanel('loading');
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    state.locating = false; setLocation(coords); loadPlaces({ force: true });
  }, () => {
    state.locating = false;
    if (state.coords) {
      $('#locationText').textContent = '上次位置';
      loadPlaces(); toast('定位未更新，继续使用上次位置'); return;
    }
    $('#locationText').textContent = '需要位置';
    showError('需要位置权限', '没有拿到定位权限。请在浏览器的位置权限里选择“允许”，再点重新推荐。');
  }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 15 * 60 * 1000 });
}

function detailFact(label, value, link = '') {
  if (!value) return '';
  const content = link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>` : escapeHtml(value);
  return `<div class="detail-fact"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
}

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}

function openDetail(place) {
  if (!place) return;
  state.activeDetail = place;
  const detailImage = place.image
    ? `<img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}的真实地点图片" referrerpolicy="no-referrer" />`
    : `<iframe title="${escapeHtml(place.name)}位置地图" loading="lazy" src="${escapeHtml(mapEmbedUrl(place))}"></iframe>`;
  $('#detailContent').innerHTML = `
    <div class="detail-hero">${detailImage}</div>
    <h1>${escapeHtml(place.name)}</h1>
    <div class="reason-chips">${reasonChips(place).map((chip) => `<span class="reason-chip">${escapeHtml(chip)}</span>`).join('')}</div>
    <p class="detail-summary">${escapeHtml(reasonFor(place))}，${escapeHtml(distanceText(place.distance))}。</p>
    <dl class="detail-facts">
      ${detailFact('类型', place.feature)}
      ${detailFact('距离', distanceText(place.distance))}
      ${detailFact('人均', place.averageCost ? `约 ¥${Math.round(place.averageCost)}/人` : '')}
      ${detailFact('评分', place.rating ? `${place.rating.toFixed(1)} 分` : '')}
      ${detailFact('地址', place.address || '打开地图查看完整地址')}
      ${detailFact('电话', place.phone, place.phone ? `tel:${place.phone}` : '')}
      ${detailFact('营业时间', place.openingHours)}
      ${detailFact('官网', place.website ? '打开官网' : '', place.website)}
      ${detailFact('画面', place.image ? '真实地点图片' : '位置地图')}
    </dl>
    <div class="detail-actions">
      <a class="primary wide" href="${escapeHtml(mapUrl(place))}" target="_blank" rel="noopener">开始导航</a>
      <button class="secondary" id="detailFavorite" type="button">${isFavorite(place) ? '取消收藏' : '下次再去'}</button>
      <button class="secondary" id="detailShare" type="button">分享</button>
      <button class="secondary" id="detailDianping" type="button">大众点评</button>
      <a class="secondary" href="${escapeHtml(appleMapsUrl(place))}" target="_blank" rel="noopener">苹果地图</a>
    </div>`;
  $('#detailFavorite').onclick = () => { toggleFavorite(place); openDetail(place); };
  $('#detailShare').onclick = () => sharePlace(place);
  $('#detailDianping').onclick = () => openDianping(place);
  $('#detailContent .detail-hero img')?.addEventListener('error', () => { place.image = ''; openDetail(place); }, { once: true });
  const dialog = $('#detailDialog'); if (!dialog.open) openDialog(dialog);
}

function persistFavorites() {
  try { localStorage.setItem(STORAGE.favorites, JSON.stringify(state.favorites)); } catch { /* private mode */ }
  updateFavoriteCount(); renderFavorites();
}

function toggleFavorite(place) {
  const index = state.favorites.findIndex((item) => item.id === place.id);
  if (index >= 0) { state.favorites.splice(index, 1); toast('已取消收藏'); }
  else { state.favorites.unshift({ ...place, savedReason: reasonFor(place), savedChips: reasonChips(place), savedMood: state.mood, savedOccasion: state.occasion }); toast('已加入“下次再去”'); }
  persistFavorites(); if (state.places.length) renderResult();
}

async function sharePlace(place) {
  const url = appleMapsUrl(place);
  const text = `安排去 ${place.name}（${distanceText(place.distance)}）\n推荐理由：${reasonFor(place)}\n${place.address || ''}`;
  try {
    if (navigator.share) await navigator.share({ title: `安排去 ${place.name}`, text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('地点已复制，可以发给朋友了'); }
  } catch (error) { if (error.name !== 'AbortError') toast('分享没有完成，再试一次'); }
}

function renderFavorites() {
  updateFavoriteCount();
  if (!state.favorites.length) {
    $('#favoritesContent').innerHTML = '<div class="empty-favorites"><div class="state-symbol"><span></span></div><h2>先留一个想去的地方</h2><p>看到不错的店，点收藏。下次不知道去哪儿，就从这里翻出来。</p></div>';
    return;
  }
  $('#favoritesContent').innerHTML = state.favorites.map((place) => `
    <div class="favorite-row" data-favorite-id="${escapeHtml(place.id)}">
      <button class="favorite-thumb" data-open-favorite="${escapeHtml(place.id)}" type="button" aria-label="查看 ${escapeHtml(place.name)}">${place.image ? `<img src="${escapeHtml(place.image)}" alt="" referrerpolicy="no-referrer" />` : '<span class="pin-shape"></span>'}</button>
      <button class="favorite-copy" data-open-favorite="${escapeHtml(place.id)}" type="button"><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(reasonFor(place))} · ${escapeHtml(distanceText(place.distance))}</span></button>
      <div class="favorite-row-actions"><button data-share-favorite="${escapeHtml(place.id)}" type="button" aria-label="分享">分享</button><button data-remove-favorite="${escapeHtml(place.id)}" type="button" aria-label="移除">移除</button></div>
    </div>`).join('');
  $$('[data-open-favorite]').forEach((button) => button.onclick = () => {
    const place = state.favorites.find((item) => item.id === button.dataset.openFavorite);
    $('#favoritesDialog').close(); openDetail(place);
  });
  $$('[data-share-favorite]').forEach((button) => button.onclick = () => sharePlace(state.favorites.find((item) => item.id === button.dataset.shareFavorite)));
  $$('[data-remove-favorite]').forEach((button) => button.onclick = () => { const place = state.favorites.find((item) => item.id === button.dataset.removeFavorite); if (place) toggleFavorite(place); });
}

function renderPreferences() {
  Object.entries(interests).forEach(([group, items]) => {
    const container = $(`[data-interest-group="${group}"]`);
    container.innerHTML = items.map(([id, label]) => `<button class="interest-chip ${state.selectedInterests.has(id) ? 'active' : ''}" data-interest="${id}" type="button">${label}</button>`).join('');
  });
  $$('[data-range]').forEach((button) => button.classList.toggle('active', button.dataset.range === state.range));
  $('#rangeHint').textContent = `最多 ${rangeLabels[state.range]}`;
  renderFilterSummary();
  $$('[data-interest]').forEach((button) => button.onclick = () => {
    const id = button.dataset.interest;
    if (state.selectedInterests.has(id)) state.selectedInterests.delete(id); else state.selectedInterests.add(id);
    localStorage.setItem(STORAGE.interests, JSON.stringify([...state.selectedInterests]));
    state.preferencesDirty = true; renderPreferences(); if (state.rawPlaces.length) { rankPlaces(); renderResult(); }
  });
}

function selectMood(mood) {
  if (mood === state.mood) return;
  state.mood = mood; localStorage.setItem(STORAGE.mood, mood);
  $$('.mood').forEach((button) => button.classList.toggle('active', button.dataset.mood === mood));
  state.rawPlaces = []; state.places = []; state.index = 0; updateMapSearch();
  if (state.coords) loadPlaces(); else setPanel('start');
}

function selectOccasion(occasion) {
  if (occasion === state.occasion) return;
  state.occasion = occasion; localStorage.setItem(STORAGE.occasion, occasion);
  $$('.occasion').forEach((button) => button.classList.toggle('active', button.dataset.occasion === occasion));
  if (state.rawPlaces.length) { state.index = 0; rankPlaces(); renderResult(); }
  if (state.coords) loadPlaces();
}

$$('.mood').forEach((button) => button.onclick = () => selectMood(button.dataset.mood));
$$('.occasion').forEach((button) => button.onclick = () => selectOccasion(button.dataset.occasion));
$('#startLocate').onclick = locate;
$('#locationButton').onclick = locate;
$('#retryButton').onclick = () => {
  if (state.errorAction === 'filters') { renderPreferences(); openDialog($('#preferencesDialog')); }
  else if (state.coords) loadPlaces({ force: true });
  else locate();
};
$('#dianpingSearchButton').onclick = openDianpingSearch;
$('#dianpingMoreButton').onclick = openDianpingSearch;
$('#shuffleButton').onclick = () => {
  if (state.places.length < 2) return toast('附近暂时只有这一个合适的');
  state.index = (state.index + 1) % state.places.length; renderResult();
};
$('#saveButton').onclick = () => toggleFavorite(currentPlace());
$('#shareButton').onclick = () => sharePlace(currentPlace());
$('#detailButton').onclick = () => openDetail(currentPlace());
$('#placeVisual').onclick = () => openDetail(currentPlace());
$('#placeVisual').onkeydown = (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); openDetail(currentPlace()); } };
$('#preferencesButton').onclick = () => { renderPreferences(); openDialog($('#preferencesDialog')); };
$('#filterSummary').onclick = () => { renderPreferences(); openDialog($('#preferencesDialog')); };
$('#favoritesButton').onclick = () => { renderFavorites(); openDialog($('#favoritesDialog')); };
$('#clearPreferences').onclick = () => {
  state.selectedInterests.clear(); localStorage.setItem(STORAGE.interests, '[]'); state.preferencesDirty = true; renderPreferences();
  if (state.rawPlaces.length) { rankPlaces(); renderResult(); } toast('偏好已清空');
};
$$('[data-range]').forEach((button) => button.onclick = () => {
  state.range = button.dataset.range; localStorage.setItem(STORAGE.range, state.range); state.preferencesDirty = true; renderPreferences();
  if (state.rawPlaces.length) { state.index = 0; rankPlaces(); renderResult(); }
});
$$('[data-close]').forEach((button) => button.onclick = () => $(`#${button.dataset.close}`).close());
$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
$('#preferencesDialog').addEventListener('close', () => {
  if (state.preferencesDirty && state.coords) { state.preferencesDirty = false; loadPlaces({ force: true }); }
});

$$('.mood').forEach((button) => button.classList.toggle('active', button.dataset.mood === state.mood));
$$('.occasion').forEach((button) => button.classList.toggle('active', button.dataset.occasion === state.occasion));
renderPreferences(); renderFavorites();
const cachedLocation = readJSON(STORAGE.location, readJSON('anpai-location-v3', null));
if (cachedLocation && Date.now() - cachedLocation.savedAt < 7 * 24 * 60 * 60 * 1000) {
  setLocation(cachedLocation, '上次位置'); loadPlaces();
} else setPanel('start');
