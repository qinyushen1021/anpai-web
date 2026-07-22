const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const moodCopy = {
  food: { label: '吃', search: '附近餐厅' },
  drink: { label: '喝', search: '附近咖啡酒吧' },
  play: { label: '玩', search: '附近展览公园电影' }
};
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
    return cached && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000 ? cached.places : [];
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

async function loadPlaces({ force = false } = {}) {
  if (!state.coords) return locate();
  const cached = readCachedPlaces();
  if (!force && cached.length) {
    state.places = cached;
    state.index = 0;
    renderResult();
  } else setPanel('loading');

  state.request?.abort();
  const controller = new AbortController();
  state.request = controller;
  try {
    const params = new URLSearchParams({ lat: state.coords.lat, lon: state.coords.lon, mood: state.mood });
    const response = await fetch(`/api/nearby?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error('nearby unavailable');
    const data = await response.json();
    if (!data.places?.length) throw new Error('no nearby places');
    state.places = data.places;
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
  if (!navigator.geolocation) {
    $('#errorText').textContent = '当前浏览器不支持定位，请直接在地图查看附近地点。';
    setPanel('error');
    return;
  }
  $('#locationText').textContent = '正在定位';
  setPanel('loading');
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    setLocation(coords);
    loadPlaces();
  }, () => {
    $('#locationText').textContent = '需要位置';
    $('#errorText').textContent = '没有拿到定位权限。请允许位置访问，或者在浏览器设置里重新开启。';
    setPanel('error');
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 });
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
