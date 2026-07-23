import './amap-config.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const uniq = (items) => [...new Set(items.filter(Boolean))];

const CONFIG = window.ANPAI_CONFIG || {};
const STORAGE = {
  mood: 'anpai-web-mood-v7',
  occasion: 'anpai-web-occasion-v7',
  range: 'anpai-web-range-v7',
  interests: 'anpai-web-interests-v7',
  favorites: 'anpai-web-favorites-v7',
  location: 'anpai-web-location-v7'
};
const CACHE_TTL = 8 * 60 * 60 * 1000;
const LOCATION_TTL = 24 * 60 * 60 * 1000;
const rangeMeters = { km1: 1000, km3: 3000, km5: 5000, more: 15000 };
const rangeLabels = { km1: '1km', km3: '3km', km5: '5km', more: '15km' };

const moodConfig = {
  food: {
    label: '吃',
    preferenceTitle: '想吃什么',
    amapQueries: ['餐厅'],
    overpass: ['["amenity"~"restaurant|fast_food|food_court"]']
  },
  drink: {
    label: '喝',
    preferenceTitle: '想喝什么',
    amapQueries: ['咖啡', '茶馆', '酒吧'],
    overpass: ['["amenity"~"cafe|bar|pub|biergarten"]', '["shop"~"tea|coffee|bakery"]']
  },
  play: {
    label: '玩',
    preferenceTitle: '想去哪里',
    amapQueries: ['美术馆', '博物馆', '电影院', '公园', '休闲娱乐'],
    overpass: [
      '["tourism"~"museum|gallery|attraction"]',
      '["leisure"~"park|sports_centre|bowling_alley"]',
      '["amenity"~"cinema|theatre|arts_centre"]'
    ]
  }
};

const occasions = {
  business: {
    label: '商务',
    reasons: { food: '请客更稳妥', drink: '安静好谈', play: '接待不尴尬' },
    positive: ['商务', '宴请', '包间', '酒店', '粤菜', '江浙', '淮扬', '日料', '西餐', '咖啡', '茶馆', '博物馆', '美术馆', '艺术中心', '剧院', '公园'],
    negative: ['快餐', '小吃', '麻辣烫', '烧烤', '夜店', 'KTV', '密室', '电玩城', '商场'],
    weights: { restaurant: 8, cafe: 7, bar: -12, culture: 12, park: 4, activity: -7, shopping: -12 }
  },
  friends: {
    label: '朋友',
    reasons: { food: '适合一起吃', drink: '适合坐下聊', play: '一起更好玩' },
    positive: ['火锅', '烧烤', '烤肉', '川菜', '湘菜', '串串', '酒吧', '精酿', '茶饮', '电影', '运动', '保龄球', '桌游', '演出'],
    negative: ['会议', '商务宴请', '酒店大堂'],
    weights: { restaurant: 9, cafe: 5, bar: 8, culture: 3, park: 2, activity: 11, shopping: 3 }
  },
  date: {
    label: '约会',
    reasons: { food: '约会不尴尬', drink: '氛围更舒服', play: '有内容不冷场' },
    positive: ['西餐', '日料', '甜品', '创意菜', '花园', '露台', '咖啡', '清吧', '鸡尾酒', '美术馆', '展览', '电影', '公园', '剧场'],
    negative: ['快餐', '大排档', '会议', '团建', '夜店'],
    weights: { restaurant: 8, cafe: 9, bar: 5, culture: 10, park: 7, activity: 7, shopping: 2 }
  },
  solo: {
    label: '自己',
    reasons: { food: '一个人也舒服', drink: '适合自己坐会儿', play: '自己逛也自在' },
    positive: ['简餐', '面馆', '拉面', '轻食', '咖啡', '茶馆', '书店', '博物馆', '美术馆', '公园', '电影'],
    negative: ['宴请', '包间', '团建', 'KTV', '密室', '夜店'],
    weights: { restaurant: 7, cafe: 11, bar: -10, culture: 10, park: 9, activity: 4, shopping: 4 }
  }
};

const interests = {
  food: [
    ['sichuan', '川菜', ['川菜', '四川', '麻辣', '串串']],
    ['hotpot', '火锅', ['火锅', '涮']],
    ['bbq', '烧烤', ['烧烤', '烤肉', '炭火']],
    ['japanese', '日料', ['日料', '寿司', '居酒屋', '日本料理']],
    ['western', '西餐', ['西餐', '牛排', '披萨', '意大利', 'bistro']],
    ['cantonese', '粤菜', ['粤菜', '广东', '港式', '早茶']],
    ['noodles', '面馆', ['面馆', '拉面', '米线', '粉面']],
    ['vegetarian', '素食', ['素食', '蔬食', '轻食']]
  ],
  drink: [
    ['coffee', '咖啡', ['咖啡', 'coffee', 'cafe']],
    ['tea', '茶饮', ['茶馆', '茶饮', '奶茶', '果茶']],
    ['dessert', '下午茶', ['甜品', '蛋糕', '烘焙', '面包']],
    ['bar', '小酌', ['酒吧', '清吧', '精酿', '鸡尾酒']]
  ],
  play: [
    ['exhibition', '展览', ['展览', '美术馆', '博物馆', '画廊']],
    ['movie', '电影', ['电影', '影院']],
    ['park', '公园', ['公园', '绿地', '滨江']],
    ['sports', '运动', ['运动', '攀岩', '保龄球', '健身']],
    ['live', '演出', ['演出', '音乐', '剧场', 'livehouse']],
    ['market', '市集', ['市集', '夜市']],
    ['bookstore', '书店', ['书店', '图书']],
    ['game', '游戏', ['桌游', '密室', '电玩城']]
  ],
  vibe: [
    ['quiet', '安静点', ['安静', '茶馆', '美术馆', '博物馆', '公园']],
    ['photogenic', '好看', ['花园', '露台', '设计', '艺术', '美术馆']],
    ['budget', '不贵', ['小吃', '面馆', '快餐', '简餐', '公园']],
    ['indoor', '室内', ['影院', '美术馆', '博物馆', '咖啡', '餐厅']],
    ['lively', '热闹', ['酒吧', '影院', '烧烤', '火锅', '市集']],
    ['chat', '能聊天', ['咖啡', '茶馆', '清吧', '公园']]
  ]
};
const interestLookup = new Map(Object.values(interests).flat().map(([id, label, keywords]) => [id, { id, label, keywords }]));

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const state = {
  mood: localStorage.getItem(STORAGE.mood) || 'food',
  occasion: localStorage.getItem(STORAGE.occasion) || 'friends',
  range: localStorage.getItem(STORAGE.range) || 'km3',
  selectedInterests: new Set(readJSON(STORAGE.interests, [])),
  favorites: readJSON(STORAGE.favorites, []),
  coords: null,
  places: [],
  index: 0,
  provider: '',
  requestId: 0,
  activeRequest: null,
  locating: false,
  activeDetail: null
};
if (!rangeMeters[state.range]) state.range = 'km3';
if (!moodConfig[state.mood]) state.mood = 'food';
if (!occasions[state.occasion]) state.occasion = 'friends';

let toastTimer;
let amapPromise;

function showPanel(name) {
  ['loading', 'permission', 'result', 'error'].forEach((panel) => {
    $(`#${panel}Panel`).classList.toggle('hidden', panel !== name);
  });
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 1800);
}

function persistPreferences() {
  localStorage.setItem(STORAGE.mood, state.mood);
  localStorage.setItem(STORAGE.occasion, state.occasion);
  localStorage.setItem(STORAGE.range, state.range);
  localStorage.setItem(STORAGE.interests, JSON.stringify([...state.selectedInterests]));
  $('#preferenceDot').classList.toggle('hidden', state.selectedInterests.size === 0);
}

function distanceMeters(a, b) {
  const rad = (number) => number * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceText(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)}m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).replace(/^http:/, 'https:'));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function initials(name) {
  const chars = [...String(name || '去')].filter((char) => /[\u3400-\u9fffA-Za-z0-9]/.test(char));
  return chars.slice(0, 2).join('') || '去';
}

function placeText(place) {
  return [place.name, place.type, place.address, ...(place.evidence || [])].join(' ').toLowerCase();
}

function categoryFromText(text, mood = state.mood) {
  if (/咖啡|茶馆|茶饮|奶茶|甜品|蛋糕|烘焙/.test(text)) return 'cafe';
  if (/酒吧|清吧|精酿|鸡尾酒|pub|bar/.test(text)) return 'bar';
  if (/博物馆|美术馆|画廊|展览|艺术中心|剧院|剧场/.test(text)) return 'culture';
  if (/公园|绿地|滨江|景区|景点/.test(text)) return 'park';
  if (/电影院|影院|运动|攀岩|保龄|桌游|密室|电玩|KTV|演出/.test(text)) return 'activity';
  if (/商场|购物|书店|市集|百货/.test(text)) return 'shopping';
  return mood === 'food' ? 'restaurant' : mood === 'drink' ? 'cafe' : 'activity';
}

function featureLabel(place) {
  const text = placeText(place);
  const labels = [
    ['火锅', /火锅|涮/], ['烧烤', /烧烤|烤肉|炭火/], ['川菜', /川菜|四川/],
    ['日料', /日料|寿司|日本料理/], ['西餐', /西餐|牛排|披萨|意大利|bistro/],
    ['粤菜', /粤菜|广东|港式|早茶/], ['咖啡馆', /咖啡|coffee|cafe/],
    ['茶馆', /茶馆|茶空间/], ['酒吧', /酒吧|清吧|精酿|鸡尾酒/],
    ['美术馆', /美术馆|画廊/], ['博物馆', /博物馆/], ['电影院', /电影院|影院/],
    ['公园', /公园|绿地|滨江/], ['运动', /运动|攀岩|保龄|健身/],
    ['剧场', /剧院|剧场|演出/], ['书店', /书店/], ['市集', /市集|夜市/]
  ];
  return labels.find(([, pattern]) => pattern.test(text))?.[0] || ({
    restaurant: '餐厅', cafe: '咖啡茶饮', bar: '小酌', culture: '展馆',
    park: '公园', activity: '玩乐', shopping: '逛逛'
  })[place.category] || moodConfig[state.mood].label;
}

function selectedRelevantInterests() {
  const group = state.mood === 'food' ? 'food' : state.mood === 'drink' ? 'drink' : 'play';
  const allowed = new Set([...interests[group], ...interests.vibe].map(([id]) => id));
  return [...state.selectedInterests].filter((id) => allowed.has(id));
}

function stableNoise(value) {
  let hash = 2166136261;
  for (const char of `${value}:${new Date().toISOString().slice(0, 10)}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function scorePlace(place) {
  const scenario = occasions[state.occasion];
  const text = placeText(place);
  let score = scenario.weights[place.category] || 0;
  score += scenario.positive.filter((word) => text.includes(word.toLowerCase())).length * 7;
  score -= scenario.negative.filter((word) => text.includes(word.toLowerCase())).length * 10;
  for (const id of selectedRelevantInterests()) {
    const interest = interestLookup.get(id);
    if (interest?.keywords.some((word) => text.includes(word.toLowerCase()))) score += 14;
  }
  if (place.rating >= 4.5) score += 9;
  else if (place.rating >= 4) score += 5;
  if (place.image) score += 7;
  if (place.cost) score += 2;
  score += Math.max(0, 11 - place.distance / Math.max(140, rangeMeters[state.range] / 11));
  score += stableNoise(place.id) * 2;
  return score;
}

function rankPlaces(places) {
  const withinRange = places.filter((place) => Number.isFinite(place.distance) && place.distance <= rangeMeters[state.range]);
  const deduped = [];
  const seen = new Set();
  for (const place of withinRange) {
    const signature = place.name.replace(/\s+/g, '').toLowerCase();
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    deduped.push({ ...place, category: place.category || categoryFromText(placeText(place)) });
  }
  return deduped.sort((a, b) => scorePlace(b) - scorePlace(a));
}

function recommendationTags(place) {
  const scenario = occasions[state.occasion];
  const text = placeText(place);
  const tags = [scenario.reasons[state.mood]];
  for (const id of selectedRelevantInterests()) {
    const interest = interestLookup.get(id);
    if (interest?.keywords.some((word) => text.includes(word.toLowerCase()))) tags.push(interest.label);
  }
  tags.push(featureLabel(place));
  if (place.rating >= 4.5) tags.push('评分不错');
  if (place.image) tags.push('有真实店图');
  return uniq(tags).slice(0, 3);
}

function reasonText(place) {
  const tags = recommendationTags(place);
  return tags.slice(0, 2).join(' · ');
}

function cacheKey(provider) {
  if (!state.coords) return '';
  return [
    'anpai-poi-v7', provider, state.mood, state.range,
    state.coords.lat.toFixed(2), state.coords.lon.toFixed(2)
  ].join(':');
}

function readCache(provider) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(provider)));
    return cached && Date.now() - cached.savedAt < CACHE_TTL ? cached.places : null;
  } catch {
    return null;
  }
}

function writeCache(provider, places) {
  try {
    localStorage.setItem(cacheKey(provider), JSON.stringify({ savedAt: Date.now(), places: places.slice(0, 80) }));
  } catch {
    // Private browsing and storage limits must not block recommendations.
  }
}

function loadAmap() {
  if (!CONFIG.amapKey || !CONFIG.amapSecurityCode) return Promise.reject(new Error('AMap is not configured'));
  if (window.AMap?.PlaceSearch) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;
  window._AMapSecurityConfig = { securityJsCode: CONFIG.amapSecurityCode };
  amapPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(CONFIG.amapKey)}`;
    script.async = true;
    script.onload = () => {
      if (!window.AMap?.plugin) return reject(new Error('AMap failed to load'));
      window.AMap.plugin('AMap.PlaceSearch', () => resolve(window.AMap));
    };
    script.onerror = () => reject(new Error('AMap failed to load'));
    document.head.appendChild(script);
  });
  return amapPromise;
}

function convertToAmap(AMap) {
  return new Promise((resolve) => {
    AMap.convertFrom([state.coords.lon, state.coords.lat], 'gps', (status, result) => {
      const location = status === 'complete' && result.locations?.[0];
      resolve(location || new AMap.LngLat(state.coords.lon, state.coords.lat));
    });
  });
}

function searchAmap(AMap, keyword, center, radius) {
  return new Promise((resolve) => {
    const service = new AMap.PlaceSearch({ pageSize: 40, pageIndex: 1, extensions: 'all' });
    service.searchNearBy(keyword, center, radius, (status, result) => {
      resolve(status === 'complete' ? result.poiList?.pois || [] : []);
    });
  });
}

function normalizeAmapPoi(poi) {
  const lon = Number(poi.location?.lng ?? poi.location?.getLng?.());
  const lat = Number(poi.location?.lat ?? poi.location?.getLat?.());
  const distance = Number(poi.distance);
  if (!poi.name || !Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(distance)) return null;
  const photos = Array.isArray(poi.photos) ? poi.photos : [];
  const image = safeUrl(photos.map((photo) => photo.url).find(Boolean));
  const rating = Number(poi.biz_ext?.rating || poi.rating || 0);
  const cost = Number(String(poi.biz_ext?.cost || poi.cost || '').replace(/[^\d.]/g, '')) || 0;
  const address = Array.isArray(poi.address) ? poi.address.join('') : String(poi.address || '');
  const type = String(poi.type || '');
  const evidence = uniq(type.split(';').map((item) => item.trim()));
  const place = {
    id: `amap-${poi.id || `${lon}-${lat}`}`,
    name: String(poi.name),
    lat, lon, distance, address, type, evidence,
    image, rating: rating > 0 ? rating : 0, cost, phone: String(poi.tel || ''),
    source: '高德地图', coordinate: 'gaode'
  };
  place.category = categoryFromText(placeText(place));
  return place;
}

async function fetchAmapPlaces() {
  const cached = readCache('amap');
  if (cached?.length) return { places: cached, provider: 'amap', source: '高德地图' };
  const AMap = await loadAmap();
  const center = await convertToAmap(AMap);
  const queries = moodConfig[state.mood].amapQueries;
  const results = [];
  for (let index = 0; index < queries.length; index += 3) {
    const batch = queries.slice(index, index + 3);
    results.push(...await Promise.all(batch.map((query) => searchAmap(AMap, query, center, rangeMeters[state.range]))));
    if (index + 3 < queries.length) await new Promise((resolve) => setTimeout(resolve, 450));
  }
  const places = results.flat().map(normalizeAmapPoi).filter(Boolean);
  if (!places.length) throw new Error('AMap returned no places');
  writeCache('amap', places);
  return { places, provider: 'amap', source: '高德地图' };
}

const overpassEndpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

function buildOverpassQuery() {
  const { lat, lon } = state.coords;
  const filters = moodConfig[state.mood].overpass;
  return `[out:json][timeout:10];(${filters.map((filter) => `nwr(around:${rangeMeters[state.range]},${lat},${lon})${filter};`).join('')});out center tags;`;
}

async function requestOverpass(signal) {
  const query = buildOverpassQuery();
  const controllers = overpassEndpoints.map(() => new AbortController());
  const abortAll = () => controllers.forEach((controller) => controller.abort());
  signal.addEventListener('abort', abortAll, { once: true });
  const attempts = overpassEndpoints.map(async (endpoint, index) => {
    const controller = controllers[index];
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const data = await response.json();
      if (!data.elements?.length) throw new Error('Overpass returned no places');
      return data;
    } finally {
      clearTimeout(timer);
    }
  });
  try {
    const result = await Promise.any(attempts);
    abortAll();
    return result;
  } finally {
    signal.removeEventListener('abort', abortAll);
    abortAll();
  }
}

function osmImage(tags) {
  const direct = safeUrl(tags.image || tags['contact:image']);
  if (direct) return direct;
  const commons = String(tags.wikimedia_commons || '');
  if (/^(File|文件):/i.test(commons)) {
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(commons.replace(/^(File|文件):/i, ''))}`;
  }
  return '';
}

function normalizeOsmItem(item) {
  const lat = Number(item.lat ?? item.center?.lat);
  const lon = Number(item.lon ?? item.center?.lon);
  const tags = item.tags || {};
  const name = String(tags.name || '').trim();
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const address = [
    tags['addr:city'], tags['addr:district'], tags['addr:street'], tags['addr:housenumber']
  ].filter(Boolean).join(' ');
  const type = [tags.amenity, tags.tourism, tags.leisure, tags.shop, tags.cuisine].filter(Boolean).join(' ');
  const place = {
    id: `osm-${item.type}-${item.id}`, name, lat, lon,
    distance: Math.round(distanceMeters(state.coords, { lat, lon })),
    address, type,
    evidence: String(tags.cuisine || '').split(/[;,]/).map((item) => item.trim()),
    image: osmImage(tags), rating: 0, cost: 0,
    phone: String(tags.phone || tags['contact:phone'] || ''),
    source: '公开地图', coordinate: 'wgs84'
  };
  place.category = categoryFromText(placeText(place));
  return place;
}

async function fetchOsmPlaces(signal) {
  const cached = readCache('osm');
  if (cached?.length) return { places: cached, provider: 'osm', source: '公开地图' };
  const data = await requestOverpass(signal);
  const places = (data.elements || []).map(normalizeOsmItem).filter(Boolean);
  if (!places.length) throw new Error('OSM returned no places');
  writeCache('osm', places);
  return { places, provider: 'osm', source: '公开地图' };
}

async function fetchPlaces({ force = false } = {}) {
  if (!state.coords) return locate();
  const requestId = ++state.requestId;
  state.activeRequest?.abort();
  state.activeRequest = new AbortController();
  if (force) {
    localStorage.removeItem(cacheKey('amap'));
    localStorage.removeItem(cacheKey('osm'));
  }
  showPanel('loading');
  $('#loadingText').textContent = force ? '正在重新挑' : '正在挑附近合适的地方';
  try {
    let result;
    try {
      result = await fetchAmapPlaces();
    } catch {
      result = await fetchOsmPlaces(state.activeRequest.signal);
    }
    if (requestId !== state.requestId) return;
    const ranked = rankPlaces(result.places);
    if (!ranked.length) throw new Error('No ranked places');
    state.places = ranked;
    state.index = 0;
    state.provider = result.provider;
    renderResults();
  } catch (error) {
    if (requestId !== state.requestId || error.name === 'AbortError') return;
    showPanel('error');
    $('#errorTitle').textContent = `在${rangeLabels[state.range]}内没挑到合适的`;
    $('#errorText').textContent = state.range === 'more'
      ? '地点服务暂时没有返回。你的位置仍保存在设备里，可以稍后重试。'
      : '可以扩大距离继续找，偏好不会把附近结果筛空。';
    $('#expandButton').classList.toggle('hidden', state.range === 'more');
  }
}

function currentPlace() {
  return state.places[state.index % Math.max(1, state.places.length)];
}

function navigationUrl(place) {
  const coordinate = place.coordinate === 'gaode' ? 'gaode' : 'wgs84';
  return `https://uri.amap.com/navigation?to=${place.lon},${place.lat},${encodeURIComponent(place.name)}&mode=walk&coordinate=${coordinate}&callnative=1`;
}

function renderImage(place, container, className = '') {
  if (place.image) {
    container.innerHTML = `<img class="${className}" src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}的地点图片" referrerpolicy="no-referrer" />`;
    container.querySelector('img')?.addEventListener('error', () => {
      place.image = '';
      renderImage(place, container, className);
    }, { once: true });
    return;
  }
  container.innerHTML = `<div class="hero-placeholder"><strong>${escapeHtml(initials(place.name))}</strong><small>暂无可验证的地点图片</small></div>`;
}

function metaItems(place) {
  return uniq([
    distanceText(place.distance),
    place.rating ? `${place.rating.toFixed(1)}分` : '',
    place.cost ? `人均 ¥${Math.round(place.cost)}` : '',
    featureLabel(place)
  ]);
}

function displaySource(place) {
  return place.source === 'OpenStreetMap' ? '公开地图' : place.source;
}

function renderResults() {
  const place = currentPlace();
  if (!place) return;
  showPanel('result');
  renderImage(place, $('#heroMedia'));
  $('#placeName').textContent = place.name;
  $('#placeMeta').textContent = metaItems(place).join(' · ');
  $('#placeReason').textContent = reasonText(place);
  $('#heroTags').innerHTML = recommendationTags(place).map((tag, index) => (
    `<span class="hero-tag${index === 0 ? ' primary' : ''}">${escapeHtml(tag)}</span>`
  )).join('');
  $('#navigateButton').href = navigationUrl(place);
  $('#sourceLabel').textContent = `地点信息来自${displaySource(place)}`;
  $('#saveButton').classList.toggle('saved', isFavorite(place));

  const alternatives = [1, 2].map((step) => state.places[(state.index + step) % state.places.length]).filter((item, index, list) => (
    item && item.id !== place.id && list.findIndex((candidate) => candidate.id === item.id) === index
  ));
  $('#alternatives').innerHTML = alternatives.map((item) => `
    <button class="alternative" type="button" data-place-id="${escapeHtml(item.id)}">
      <span class="alternative-thumb">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" referrerpolicy="no-referrer" />` : escapeHtml(initials(item.name))}
      </span>
      <span class="alternative-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(reasonText(item))}</span>
      </span>
      <span class="alternative-meta">
        <b>${escapeHtml(distanceText(item.distance))}</b>
        <span>${escapeHtml(item.rating ? `${item.rating.toFixed(1)}分` : featureLabel(item))}</span>
      </span>
    </button>
  `).join('');
  $$('.alternative').forEach((button) => {
    button.onclick = () => {
      const index = state.places.findIndex((item) => item.id === button.dataset.placeId);
      if (index >= 0) {
        state.index = index;
        renderResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  });
  $$('.alternative img').forEach((image) => image.addEventListener('error', () => {
    image.replaceWith(document.createTextNode(initials(state.places.find((item) => item.image === image.src)?.name || '去')));
  }, { once: true }));
}

function isFavorite(place) {
  return state.favorites.some((item) => item.id === place.id);
}

function updateFavoriteCount() {
  $('#favoriteCount').textContent = String(state.favorites.length);
  $('#favoriteCount').classList.toggle('hidden', state.favorites.length === 0);
}

function toggleFavorite(place) {
  if (isFavorite(place)) state.favorites = state.favorites.filter((item) => item.id !== place.id);
  else state.favorites.unshift({ ...place, savedAt: Date.now() });
  localStorage.setItem(STORAGE.favorites, JSON.stringify(state.favorites.slice(0, 60)));
  updateFavoriteCount();
  renderResults();
  toast(isFavorite(place) ? '已收藏' : '已取消收藏');
}

function dianpingUrl(place) {
  return `dianping://searchshoplist?keyword=${encodeURIComponent(place.name)}`;
}

function openDianping(place) {
  let leftPage = false;
  const onVisibility = () => { if (document.hidden) leftPage = true; };
  document.addEventListener('visibilitychange', onVisibility, { once: true });
  window.location.href = dianpingUrl(place);
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (!leftPage) window.location.href = 'https://www.dianping.com/';
  }, 1200);
}

async function sharePlace(place) {
  const text = `${place.name} · ${metaItems(place).join(' · ')}`;
  const url = navigationUrl(place);
  if (navigator.share) {
    try {
      await navigator.share({ title: `安排：${place.name}`, text, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('地点已复制');
  } catch {
    toast('可以截屏分享这家');
  }
}

function detailFacts(place) {
  return [
    ['距离', distanceText(place.distance)],
    ['评分', place.rating ? `${place.rating.toFixed(1)} 分` : '暂无评分'],
    ['人均', place.cost ? `约 ¥${Math.round(place.cost)}` : '暂无人均信息'],
    ['地址', place.address || '请在地图中查看'],
    ['电话', place.phone || '暂无电话']
  ];
}

function openDetail(place) {
  state.activeDetail = place;
  const tags = recommendationTags(place);
  $('#detailContent').innerHTML = `
    <div class="detail-media" id="detailMedia"></div>
    <h1>${escapeHtml(place.name)}</h1>
    <div class="detail-tags">${tags.map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <dl class="detail-list">
      ${detailFacts(place).map(([label, value]) => `<div class="detail-fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
    </dl>
    <p class="detail-source">地点信息来自${escapeHtml(displaySource(place))}；评价和更多店图请以大众点评实际页面为准。</p>
    <div class="detail-actions">
      <a class="primary-button" href="${escapeHtml(navigationUrl(place))}" target="_blank" rel="noopener">开始导航</a>
      <button class="quiet-button dianping-button" id="detailDianping" type="button">大众点评</button>
      <button class="quiet-button wide" id="detailShare" type="button">分享这个地点</button>
    </div>
  `;
  renderImage(place, $('#detailMedia'));
  $('#detailDianping').onclick = () => openDianping(place);
  $('#detailShare').onclick = () => sharePlace(place);
  $('#detailDialog').showModal();
}

function renderPreferences() {
  $('#moodPreferenceTitle').textContent = moodConfig[state.mood].preferenceTitle;
  const group = state.mood === 'food' ? interests.food : state.mood === 'drink' ? interests.drink : interests.play;
  const renderGroup = (items) => items.map(([id, label]) => (
    `<button class="interest-chip${state.selectedInterests.has(id) ? ' active' : ''}" data-interest="${id}" type="button">${escapeHtml(label)}</button>`
  )).join('');
  $('#moodInterests').innerHTML = renderGroup(group);
  $('#vibeInterests').innerHTML = renderGroup(interests.vibe);
  $$('#rangeSwitch button').forEach((button) => button.classList.toggle('active', button.dataset.range === state.range));
  $$('.interest-chip').forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.interest;
      if (state.selectedInterests.has(id)) state.selectedInterests.delete(id);
      else state.selectedInterests.add(id);
      persistPreferences();
      button.classList.toggle('active');
      if (state.places.length) {
        state.places = rankPlaces(state.places);
        state.index = 0;
      }
    };
  });
}

function renderFavorites() {
  if (!state.favorites.length) {
    $('#favoritesContent').innerHTML = '<div class="empty-state"><h2>还没有收藏</h2><p>遇到想去的地方，点一下书签，下次不用重新找。</p></div>';
  } else {
    $('#favoritesContent').innerHTML = state.favorites.map((place) => `
      <div class="favorite-row">
        <span class="favorite-thumb">${place.image ? `<img src="${escapeHtml(place.image)}" alt="" referrerpolicy="no-referrer" />` : escapeHtml(initials(place.name))}</span>
        <button class="favorite-copy" type="button" data-open-favorite="${escapeHtml(place.id)}">
          <strong>${escapeHtml(place.name)}</strong>
          <span>${escapeHtml(metaItems(place).join(' · '))}</span>
        </button>
        <button class="remove-favorite" type="button" data-remove-favorite="${escapeHtml(place.id)}" aria-label="删除收藏">×</button>
      </div>
    `).join('');
    $$('[data-open-favorite]').forEach((button) => button.onclick = () => {
      const place = state.favorites.find((item) => item.id === button.dataset.openFavorite);
      if (place) openDetail(place);
    });
    $$('[data-remove-favorite]').forEach((button) => button.onclick = () => {
      state.favorites = state.favorites.filter((item) => item.id !== button.dataset.removeFavorite);
      localStorage.setItem(STORAGE.favorites, JSON.stringify(state.favorites));
      updateFavoriteCount();
      renderFavorites();
    });
  }
  $('#favoritesDialog').showModal();
}

function setLocation(coords, label = '位置已获取') {
  state.coords = {
    lat: Number(coords.latitude ?? coords.lat),
    lon: Number(coords.longitude ?? coords.lon)
  };
  localStorage.setItem(STORAGE.location, JSON.stringify({ ...state.coords, savedAt: Date.now() }));
  $('#locationText').textContent = label;
  $('#locationButton').classList.add('ready');
  $('#locationButton').classList.remove('failed');
}

function locate({ silent = false } = {}) {
  if (state.locating) return;
  if (!navigator.geolocation) {
    showPanel('permission');
    $('#permissionText').textContent = '当前浏览器无法定位，可以换 Safari 或 Chrome 再试。';
    return;
  }
  state.locating = true;
  if (!silent) {
    showPanel('loading');
    $('#loadingText').textContent = '正在获取你的位置';
  }
  $('#locationText').textContent = '正在更新位置';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    state.locating = false;
    setLocation(coords);
    fetchPlaces();
  }, (error) => {
    state.locating = false;
    $('#locationButton').classList.add('failed');
    $('#locationButton').classList.remove('ready');
    $('#locationText').textContent = '定位未开启';
    if (silent && state.places.length) return;
    showPanel('permission');
    $('#permissionText').textContent = error.code === 1
      ? '请在浏览器设置里允许定位，然后回来再试一次。'
      : '这次没有拿到位置，点下面按钮可以重新尝试。';
  }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 5 * 60 * 1000 });
}

function selectMood(mood) {
  if (state.mood === mood) return;
  state.mood = mood;
  state.index = 0;
  persistPreferences();
  renderControls();
  if (state.coords) fetchPlaces();
}

function selectOccasion(occasion) {
  if (state.occasion === occasion) return;
  state.occasion = occasion;
  state.index = 0;
  persistPreferences();
  renderControls();
  if (state.places.length) {
    state.places = rankPlaces(state.places);
    renderResults();
  }
}

function renderControls() {
  $$('.mood').forEach((button) => button.classList.toggle('active', button.dataset.mood === state.mood));
  $$('.occasion').forEach((button) => button.classList.toggle('active', button.dataset.occasion === state.occasion));
  $('#rangeButtonText').textContent = rangeLabels[state.range];
}

function expandRange() {
  const order = ['km1', 'km3', 'km5', 'more'];
  const next = order[Math.min(order.length - 1, order.indexOf(state.range) + 1)];
  if (next === state.range) return;
  state.range = next;
  persistPreferences();
  renderControls();
  renderPreferences();
  fetchPlaces();
}

$$('.mood').forEach((button) => button.onclick = () => selectMood(button.dataset.mood));
$$('.occasion').forEach((button) => button.onclick = () => selectOccasion(button.dataset.occasion));
$('#locationButton').onclick = () => locate();
$('#startLocate').onclick = () => locate();
$('#retryButton').onclick = () => fetchPlaces({ force: true });
$('#expandButton').onclick = expandRange;
$('#rangeButton').onclick = () => {
  renderPreferences();
  $('#preferencesDialog').showModal();
};
$('#preferencesButton').onclick = () => {
  renderPreferences();
  $('#preferencesDialog').showModal();
};
$('#favoritesButton').onclick = renderFavorites;
$('#heroButton').onclick = () => currentPlace() && openDetail(currentPlace());
$('#detailButton').onclick = () => currentPlace() && openDetail(currentPlace());
$('#saveButton').onclick = () => currentPlace() && toggleFavorite(currentPlace());
$('#shareButton').onclick = () => currentPlace() && sharePlace(currentPlace());
$('#refreshButton').onclick = () => {
  if (state.places.length <= 3) return fetchPlaces({ force: true });
  state.index = (state.index + 3) % state.places.length;
  $('#refreshButton').classList.add('spinning');
  setTimeout(() => {
    renderResults();
    $('#refreshButton').classList.remove('spinning');
  }, 140);
};
$('#clearPreferences').onclick = () => {
  state.selectedInterests.clear();
  persistPreferences();
  renderPreferences();
  if (state.places.length) {
    state.places = rankPlaces(state.places);
    state.index = 0;
  }
};
$$('#rangeSwitch button').forEach((button) => button.onclick = () => {
  if (state.range === button.dataset.range) return;
  state.range = button.dataset.range;
  persistPreferences();
  renderControls();
  renderPreferences();
  if (state.coords) fetchPlaces();
});
$$('[data-close]').forEach((button) => button.onclick = () => {
  const dialog = document.getElementById(button.dataset.close);
  dialog.close();
  if (dialog.id === 'preferencesDialog' && state.places.length) renderResults();
});
[$('#preferencesDialog'), $('#detailDialog'), $('#favoritesDialog')].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

function localTestCoordinates() {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return null;
  const params = new URLSearchParams(location.search);
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function start() {
  renderControls();
  renderPreferences();
  persistPreferences();
  updateFavoriteCount();
  const testCoords = localTestCoordinates();
  if (testCoords) {
    setLocation(testCoords, '测试位置');
    fetchPlaces();
    return;
  }
  const saved = [
    readJSON(STORAGE.location, null),
    readJSON('anpai-location-v4', null),
    readJSON('anpai-location-v3', null),
    readJSON('anpai-last-location', null)
  ].find((item) => item && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)));
  if (saved && Date.now() - saved.savedAt < LOCATION_TTL) {
    setLocation(saved, '上次的位置');
    fetchPlaces();
    setTimeout(() => locate({ silent: true }), 900);
  } else {
    setTimeout(() => locate(), 250);
  }
}

start();
