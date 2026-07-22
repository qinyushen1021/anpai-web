const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const moodCopy = {
  food: { label: '吃', search: '附近餐厅' },
  drink: { label: '喝', search: '附近咖啡酒吧' },
  play: { label: '玩', search: '附近展览公园电影' }
};
const nearbyConfig = {
  food: { filters: ['["amenity"~"restaurant|fast_food|food_court"]'], query: 'restaurant', photon: ['restaurant', 'food', 'noodle', 'hotpot'] },
  drink: { filters: ['["amenity"~"cafe|bar|pub|biergarten"]'], query: 'cafe', photon: ['cafe', 'coffee', 'bar', 'tea'] },
  play: { filters: ['["tourism"~"museum|gallery|attraction"]', '["leisure"~"park|sports_centre|bowling_alley"]', '["amenity"~"cinema|theatre|arts_centre"]'], query: 'museum', photon: ['museum', 'cinema', 'gallery', 'theatre', 'park'] }
};
const overpassEndpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];
const occasionReasons = {
  business: { food: '稳妥安静，方便聊事', drink: '环境安静，适合会谈', play: '有内容，适合接待' },
  friends: { food: '适合朋友一起吃', drink: '能聊天，也能续摊', play: '一起去更有意思' },
  date: { food: '氛围舒服，不会太赶', drink: '适合坐下来慢慢聊', play: '有内容，不容易冷场' },
  solo: { food: '一个人去也轻松', drink: '适合自己坐一会儿', play: '一个人逛也自在' }
};

const state = {
  mood: localStorage.getItem('anpai-mood-v3') || 'food',
  occasion: localStorage.getItem('anpai-occasion-v3') || 'friends',
  coords: null,
  places: [],
  index: 0,
  request: null,
  locating: false,
  favorites: JSON.parse(localStorage.getItem('anpai-favorites-v3') || '[]')
};
let toastTimer;

function setPanel(name) {
  ['start', 'loading', 'result', 'error'].forEach((panel) => $(`#${panel}Panel`).classList.toggle('hidden', panel !== name));
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 1800);
}

function distanceText(meters) {
  if (!Number.isFinite(meters)) return '';
  const minutes = Math.max(1, Math.round(meters / 78));
  return minutes < 45 ? `步行约 ${minutes} 分钟` : `约 ${(meters / 1000).toFixed(1)} 公里`;
}

function cacheKey(mood = state.mood) {
  if (!state.coords) return '';
  return `${mood}:${state.coords.lat.toFixed(2)}:${state.coords.lon.toFixed(2)}`;
}

function readCachedPlaces() {
  try {
    const cached = JSON.parse(localStorage.getItem(`anpai-result:${cacheKey()}`));
    return cached && Date.now() - cached.savedAt < 7 * 24 * 60 * 60 * 1000 ? cached.places : [];
  } catch { return []; }
}

function writeCachedPlaces(places) {
  try { localStorage.setItem(`anpai-result:${cacheKey()}`, JSON.stringify({ savedAt: Date.now(), places })); } catch { }
}

function setLocation(coords, label = '位置已获取') {
  state.coords = { lat: coords.latitude ?? coords.lat, lon: coords.longitude ?? coords.lon };
  $('#locationText').textContent = label;
  $('#locationButton').classList.add('ready');
  try { localStorage.setItem('anpai-location-v3', JSON.stringify({ ...state.coords, savedAt: Date.now() })); } catch { }
  updateMapSearch();
}

function updateMapSearch() {
  if (!state.coords) return;
  const query = encodeURIComponent(moodCopy[state.mood].search);
  $('#mapSearchButton').href = `https://uri.amap.com/search?keyword=${query}&center=${state.coords.lon},${state.coords.lat}`;
}

function distanceMeters(a, b) {
  const rad = (number) => number * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function timedSignal(ms, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, ms);
  parentSignal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
    }
  };
}

function normalizePlaces(elements, origin, mood) {
  const names = new Set();
  return elements.map((item) => {
    const lat = Number(item.lat ?? item.center?.lat);
    const lon = Number(item.lon ?? item.center?.lon);
    const tags = item.tags || {};
    const name = tags.name?.trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || names.has(name)) return null;
    names.add(name);
    const type = tags.amenity || tags.tourism || tags.leisure || mood;
    const feature = ({ restaurant: '餐厅', fast_food: '简餐', food_court: '美食', cafe: '咖啡', bar: '酒吧', pub: '小酌', biergarten: '小酌', museum: '展馆', gallery: '看展', attraction: '景点', park: '公园', cinema: '电影', theatre: '剧场', arts_centre: '艺术', sports_centre: '运动', bowling_alley: '保龄球' })[type] || moodCopy[mood].label;
    const image = tags.image?.startsWith('https://') ? tags.image : '';
    const address = tags.address || [tags['addr:district'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const distance = Math.round(distanceMeters(origin, { lat, lon }));
    if (distance > 15000) return null;
    return { id: `${item.type || 'place'}-${item.id}`, name, lat, lon, distance, feature, image, address };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 24);
}

async function fetchOverpassDirect(lat, lon, mood, parentSignal) {
  const radius = 2600;
  const clauses = nearbyConfig[mood].filters.map((filter) => `nwr(around:${radius},${lat},${lon})${filter};`).join('');
  const query = `[out:json][timeout:10];(${clauses});out center tags 80;`;
  const request = async (endpoint) => {
    const timeout = timedSignal(8500, parentSignal);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: timeout.signal
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const payload = await response.json();
      if (!payload.elements?.length) throw new Error('No Overpass places');
      return payload.elements;
    } finally { timeout.done(); }
  };
  try { return await Promise.any(overpassEndpoints.slice(0, 2).map(request)); }
  catch { return Promise.any(overpassEndpoints.slice(2).map(request)); }
}

async function fetchNominatimDirect(lat, lon, mood, parentSignal) {
  const delta = .035;
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: nearbyConfig[mood].query,
    viewbox: `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`,
    bounded: '1',
    limit: '30',
    addressdetails: '1',
    extratags: '1',
    'accept-language': 'zh-CN,zh,en'
  });
  const timeout = timedSignal(8500, parentSignal);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: timeout.signal });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const results = await response.json();
    if (!results.length) throw new Error('No Nominatim places');
    return results.map((item) => ({
      type: 'nominatim', id: item.place_id, lat: Number(item.lat), lon: Number(item.lon),
      tags: { ...(item.extratags || {}), name: item.display_name?.split(',')[0], amenity: item.type, address: item.display_name }
    }));
  } finally { timeout.done(); }
}

async function fetchPhotonDirect(lat, lon, mood, parentSignal) {
  const allowed = {
    food: new Set(['amenity:restaurant', 'amenity:fast_food', 'amenity:food_court']),
    drink: new Set(['amenity:cafe', 'amenity:bar', 'amenity:pub', 'amenity:biergarten']),
    play: new Set(['tourism:museum', 'tourism:gallery', 'tourism:attraction', 'leisure:park', 'leisure:sports_centre', 'leisure:bowling_alley', 'amenity:cinema', 'amenity:theatre', 'amenity:arts_centre'])
  }[mood];
  const request = async (query) => {
    const params = new URLSearchParams({ q: query, lat, lon, limit: '20' });
    const timeout = timedSignal(7000, parentSignal);
    try {
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: timeout.signal });
      if (!response.ok) throw new Error(`Photon ${response.status}`);
      const payload = await response.json();
      return payload.features || [];
    } finally { timeout.done(); }
  };
  const batches = await Promise.all(nearbyConfig[mood].photon.map(request));
  return batches.flat().map((item) => {
      const properties = item.properties || {};
      const category = `${properties.osm_key}:${properties.osm_value}`;
      if (!properties.name || !allowed.has(category)) return null;
      return {
        type: 'photon', id: properties.osm_id || `${item.geometry?.coordinates?.[0]}-${item.geometry?.coordinates?.[1]}`,
        lat: Number(item.geometry?.coordinates?.[1]), lon: Number(item.geometry?.coordinates?.[0]),
        tags: {
          name: properties.name,
          [properties.osm_key || 'amenity']: properties.osm_value,
          address: [properties.district, properties.street, properties.housenumber, properties.city].filter(Boolean).join(' ')
        }
      };
    }).filter(Boolean);
}

async function fetchDirectPlaces(signal) {
  const { lat, lon } = state.coords;
  const loaders = [fetchOverpassDirect, fetchPhotonDirect, fetchNominatimDirect];
  for (const loader of loaders) {
    try {
      const elements = await loader(lat, lon, state.mood, signal);
      const places = normalizePlaces(elements, { lat, lon }, state.mood);
      if (places.length) return places;
    } catch (error) {
      if (error.name === 'AbortError' && signal.aborted) throw error;
    }
  }
  throw new Error('No nearby places');
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
    } catch (error) {
      if (error.name === 'AbortError') throw error;
    }
  }
  return fetchDirectPlaces(signal);
}

async function loadPlaces({ force = false } = {}) {
  if (!state.coords) return locate();
  const cached = readCachedPlaces();
  if (cached.length && (!force || !state.places.length)) {
    state.places = cached;
    state.index = 0;
    renderResult();
  } else if (!state.places.length) setPanel('loading');

  state.request?.abort();
  const controller = new AbortController();
  state.request = controller;
  try {
    state.places = await fetchNearbyPlaces(controller.signal);
    state.index = 0;
    writeCachedPlaces(state.places);
    renderResult();
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (state.places.length) {
      renderResult();
      toast('已显示最近一次结果');
    } else {
      $('#errorText').textContent = '位置已经拿到，地点服务暂时没有返回。你可以重试，或者直接去地图查看。';
      setPanel('error');
    }
  } finally {
    if (state.request === controller) state.request = null;
  }
}

function locate() {
  if (state.locating) return;
  if (!navigator.geolocation) {
    $('#errorText').textContent = '当前浏览器不支持定位，请直接在地图查看附近地点。';
    setPanel('error');
    return;
  }
  state.locating = true;
  $('#locationText').textContent = '正在定位';
  const cached = state.coords ? readCachedPlaces() : [];
  if (cached.length) {
    state.places = cached;
    state.index = 0;
    renderResult();
  } else if (!state.places.length) setPanel('loading');
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    state.locating = false;
    setLocation(coords);
    loadPlaces();
  }, () => {
    state.locating = false;
    if (state.coords) {
      $('#locationText').textContent = '上次位置';
      if (state.places.length) renderResult();
      else loadPlaces();
      toast('定位未更新，继续使用上次位置');
      return;
    }
    $('#locationText').textContent = '需要位置';
    $('#errorText').textContent = '没有拿到定位权限。请允许位置访问，或者在浏览器设置里重新开启。';
    setPanel('error');
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 });
}

function currentPlace() { return state.places[state.index % state.places.length]; }

function reasonFor(place) {
  const evidence = [occasionReasons[state.occasion][state.mood], place.feature].filter(Boolean);
  return [...new Set(evidence)].slice(0, 2).join('，');
}

function mapUrl(place) {
  return `https://uri.amap.com/navigation?to=${place.lon},${place.lat},${encodeURIComponent(place.name)}&mode=walk`;
}

function renderVisual(place) {
  const visual = $('#placeVisual');
  visual.innerHTML = place.image ? `<img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}的地点图片" referrerpolicy="no-referrer" />` : '<span class="pin-shape"></span>';
}

function renderResult() {
  const place = currentPlace();
  if (!place) return setPanel('error');
  $('#resultKicker').textContent = state.index === 0 ? '就去这家' : '换一个选择';
  $('#distanceText').textContent = distanceText(place.distance);
  $('#placeName').textContent = place.name;
  $('#placeReason').textContent = reasonFor(place);
  $('#navigateButton').href = mapUrl(place);
  $('#saveButton').textContent = state.favorites.some((item) => item.id === place.id) ? '已收藏' : '收藏';
  $('#remainingText').textContent = state.places.length > 1 ? `还有 ${state.places.length - 1} 个选择` : '附近只找到这一个';
  renderVisual(place);
  const alternatives = [1, 2].map((step) => state.places[(state.index + step) % state.places.length]).filter((item, i, all) => item && item.id !== place.id && all.findIndex((other) => other.id === item.id) === i);
  $('#alternatives').innerHTML = alternatives.map((item, index) => `<button class="alternative" data-id="${escapeHtml(item.id)}" type="button"><span class="alternative-index">${index + 2}</span><span class="alternative-copy"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(reasonFor(item))}</span></span><span class="alternative-distance">${distanceText(item.distance)}</span></button>`).join('');
  $$('[data-id]').forEach((button) => button.onclick = () => {
    const target = state.places.findIndex((item) => item.id === button.dataset.id);
    if (target >= 0) { state.index = target; renderResult(); }
  });
  $('#recommendation').onclick = (event) => { if (!event.target.closest('a,button')) openDetail(place); };
  setPanel('result');
}

function openDetail(place) {
  $('#detailContent').innerHTML = `<h2>${escapeHtml(place.name)}</h2><p>${escapeHtml(reasonFor(place))}</p><dl><div><dt>距离</dt><dd>${distanceText(place.distance)}</dd></div><div><dt>类型</dt><dd>${escapeHtml(place.feature || moodCopy[state.mood].label)}</dd></div><div><dt>地址</dt><dd>${escapeHtml(place.address || '打开地图查看完整地址')}</dd></div></dl><a class="primary" href="${mapUrl(place)}" target="_blank" rel="noopener">开始导航</a>`;
  $('#detailDialog').showModal();
}

function selectMood(mood) {
  state.mood = mood;
  localStorage.setItem('anpai-mood-v3', mood);
  $$('.mood').forEach((button) => button.classList.toggle('active', button.dataset.mood === mood));
  updateMapSearch();
  if (state.coords) { state.places = []; loadPlaces(); }
}

function selectOccasion(occasion) {
  state.occasion = occasion;
  localStorage.setItem('anpai-occasion-v3', occasion);
  $$('.occasion').forEach((button) => button.classList.toggle('active', button.dataset.occasion === occasion));
  if (state.places.length) renderResult();
}

$$('.mood').forEach((button) => button.onclick = () => selectMood(button.dataset.mood));
$$('.occasion').forEach((button) => button.onclick = () => selectOccasion(button.dataset.occasion));
$('#startLocate').onclick = locate;
$('#locationButton').onclick = locate;
$('#retryButton').onclick = () => state.coords ? loadPlaces({ force: true }) : locate();
$('#shuffleButton').onclick = () => {
  if (state.places.length < 2) return toast('附近暂时只有这一个合适的');
  state.index = (state.index + 1) % state.places.length;
  renderResult();
};
$('#saveButton').onclick = () => {
  const place = currentPlace();
  const index = state.favorites.findIndex((item) => item.id === place.id);
  if (index >= 0) { state.favorites.splice(index, 1); toast('已取消收藏'); }
  else { state.favorites.unshift(place); toast('已收藏'); }
  localStorage.setItem('anpai-favorites-v3', JSON.stringify(state.favorites));
  renderResult();
};
$('#detailClose').onclick = () => $('#detailDialog').close();
$('#detailDialog').onclick = (event) => { if (event.target === $('#detailDialog')) $('#detailDialog').close(); };

$$('.mood').forEach((button) => button.classList.toggle('active', button.dataset.mood === state.mood));
$$('.occasion').forEach((button) => button.classList.toggle('active', button.dataset.occasion === state.occasion));
try {
  const cachedLocation = JSON.parse(localStorage.getItem('anpai-location-v3'));
  if (cachedLocation && Date.now() - cachedLocation.savedAt < 24 * 60 * 60 * 1000) {
    setLocation(cachedLocation, '上次位置');
    loadPlaces();
  } else setPanel('start');
} catch { setPanel('start'); }
