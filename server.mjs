import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const cache = new Map();

const configs = {
  food: { filters: ['["amenity"~"restaurant|fast_food|food_court"]'], query: 'restaurant' },
  drink: { filters: ['["amenity"~"cafe|bar|pub|biergarten"]'], query: 'cafe' },
  play: { filters: ['["tourism"~"museum|gallery|attraction"]', '["leisure"~"park|sports_centre|bowling_alley"]', '["amenity"~"cinema|theatre|arts_centre"]'], query: 'museum' }
};
const overpassEndpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

function distanceMeters(a, b) {
  const rad = (number) => number * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchOverpass(lat, lon, mood) {
  const radius = 2600;
  const clauses = configs[mood].filters.map((filter) => `nwr(around:${radius},${lat},${lon})${filter};`).join('');
  const query = `[out:json][timeout:12];(${clauses});out center tags 80;`;
  return Promise.any(overpassEndpoints.map(async (endpoint) => {
    const timeout = withTimeout(9000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }), signal: timeout.signal });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const payload = await response.json();
      if (!payload.elements?.length) throw new Error('No places');
      return payload.elements;
    } finally { timeout.done(); }
  }));
}

async function fetchNominatim(lat, lon, mood) {
  const delta = .035;
  const params = new URLSearchParams({ format: 'jsonv2', q: configs[mood].query, viewbox: `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`, bounded: '1', limit: '30', addressdetails: '1', extratags: '1' });
  const timeout = withTimeout(9000);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'User-Agent': 'AnpaiNearby/1.0', 'Accept-Language': 'zh-CN,zh;q=0.9' }, signal: timeout.signal });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const results = await response.json();
    return results.map((item) => ({ type: 'nominatim', id: item.place_id, lat: Number(item.lat), lon: Number(item.lon), tags: { ...(item.extratags || {}), name: item.display_name?.split(',')[0], amenity: item.type, address: item.display_name } }));
  } finally { timeout.done(); }
}

function normalize(elements, origin, mood) {
  const names = new Set();
  return elements.map((item) => {
    const lat = Number(item.lat ?? item.center?.lat);
    const lon = Number(item.lon ?? item.center?.lon);
    const tags = item.tags || {};
    const name = tags.name?.trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || names.has(name)) return null;
    names.add(name);
    const type = tags.amenity || tags.tourism || tags.leisure || mood;
    const feature = ({ restaurant: '餐厅', fast_food: '简餐', food_court: '美食', cafe: '咖啡', bar: '酒吧', pub: '小酌', museum: '展馆', gallery: '看展', attraction: '景点', park: '公园', cinema: '电影', theatre: '剧场', sports_centre: '运动' })[type] || configs[mood].query;
    const image = tags.image?.startsWith('https://') ? tags.image : '';
    const address = tags.address || [tags['addr:district'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    return { id: `${item.type}-${item.id}`, name, lat, lon, distance: Math.round(distanceMeters(origin, { lat, lon })), feature, image, address };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 24);
}

app.get('/api/nearby', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const mood = configs[req.query.mood] ? req.query.mood : 'food';
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'invalid location' });
  const key = `${mood}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.savedAt < 15 * 60 * 1000) return res.json({ places: cached.places, cached: true });
  try {
    let elements;
    try { elements = await fetchOverpass(lat, lon, mood); }
    catch { elements = await fetchNominatim(lat, lon, mood); }
    const places = normalize(elements, { lat, lon }, mood);
    if (!places.length) throw new Error('no places');
    cache.set(key, { savedAt: Date.now(), places });
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ places });
  } catch (error) {
    res.status(503).json({ error: 'nearby unavailable' });
  }
});

for (const file of ['index.html', 'style.css', 'app.js', 'app-icon.png']) {
  app.get(`/${file}`, (_req, res) => res.sendFile(path.join(root, file)));
}
app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.listen(port, () => console.log(`Anpai running on ${port}`));
