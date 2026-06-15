
// ── STATE ────────────────────────────────────────────────────────────
let farms = [];
let markers = {};
let activeFilter = null;
let activeCard = null;
let map;

// ── MAP INIT ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  map = L.map('map', { zoomControl: true }).setView([48.35, 15.90], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  loadCSVFile('farms.csv');
  setTimeout(() => map.invalidateSize(), 100);
});

async function loadCSVFile(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const text = await response.text();
    const data = parseCSV(text);
    loadData(data);
  } catch (err) {
    console.error('Failed to load CSV:', err);
    alert('Could not load farm data.');
  }
}

// ── LOAD & RENDER ─────────────────────────────────────────────────────────
function loadData(data) {
  farms = data;
  clearAll();
  buildFilters();
  renderAll(farms);
  if (farms.length) fitMap(farms);
}

function clearAll() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  document.getElementById('cardsList').innerHTML = '';
  // reset filter chips except first two
  const bar = document.getElementById('filterBar');
  while (bar.children.length > 2) bar.removeChild(bar.lastChild);
  activeFilter = null;
  activeCard = null;
  document.querySelector('.chip-all').classList.add('active');
}

function buildFilters() {
  const bar = document.getElementById('filterBar');
  const allProducts = new Set();
  farms.forEach(f => {
    f.products.map(p => p.trim()).filter(Boolean).forEach(p => allProducts.add(p));
  });
   const orderedProducts = Object.keys(PRODUCT_LABELS).filter(p => allProducts.has(p));
  orderedProducts.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = PRODUCT_LABELS[p] || p;
    btn.onclick = () => filterByProduct(p, btn);
    bar.appendChild(btn);
  });
}

function renderAll(subset) {
  const list = document.getElementById('cardsList');
  list.innerHTML = '';
  document.getElementById('countBadge').textContent = `${subset.length} angezeigt`;
  document.getElementById('emptyState').style.display = subset.length ? 'none' : 'block';

  subset.forEach((farm, i) => {
    // Card
    const card = document.createElement('div');
    card.className = 'farm-card';
    card.id = `card-${i}`;
    card.innerHTML = cardHTML(farm);
    card.onclick = () => selectFarm(farm, i);
    list.appendChild(card);

    // Marker
    const icon = L.divIcon({
      className: '',
      html: `<div class="farm-marker" id="marker-icon-${i}"></div>`,
      iconSize: [32, 32],
      iconAnchor: [10, 32],
      popupAnchor: [6, -34]
    });

    const marker = L.marker([farm.lat, farm.lng], { icon }).addTo(map);
    marker.bindPopup(popupHTML(farm));
    marker.on('click', () => selectFarm(farm, i));
    markers[i] = marker;
  });
}

function cardHTML(f) {
    const tags = f.products.map(p =>
    `<span class="tag">${PRODUCT_LABELS[p] || p}</span>`
  ).join('');
  const contact = [];
  if (f.phone) contact.push(`<span> ${f.phone}</span>`);
  if (f.email) contact.push(`<a href="mailto:${f.email}"> ${f.email}</a>`);
  if (f.website) contact.push(`<a href="https://${f.website}" target="_blank"> ${f.website}</a>`);
  const bioLabel = f.bio === '1' ? '<span class="bio-label">bio</span>' : '';
  return `
    <div class="card-name">${f.name}${bioLabel}</div>
    <div class="card-address">${f.address}</div>
    <div class="card-tags">${tags}</div>
    ${contact.length ? `<div class="card-contact">${contact.join(' · ')}</div>` : ''}
  `;
}

function popupHTML(f) {
    const tags = f.products.map(p =>
    `<span class="tag">${PRODUCT_LABELS[p] || p}</span>`
  ).join('');
  const contact = [];
  if (f.phone) contact.push(f.phone);
  if (f.email) contact.push(`<a href="mailto:${f.email}">${f.email}</a>`);
  if (f.website) contact.push(`<a href="https://${f.website}" target="_blank">${f.website}</a>`);
  const bioLabel = f.bio === '1' ? '<span class="bio-label">bio</span>' : '';
  return `<div class="popup-inner">
    <div class="popup-name">${f.name}${bioLabel}</div>
    <div class="popup-addr">${f.address}</div>
    <div class="popup-tags">${tags}</div>
    ${contact.length ? `<div class="popup-contact">${contact.join('<br>')}</div>` : ''}
  </div>`;
}

const PRODUCT_LABELS = {
  eggs: "Eier",
  honey: "Honig",
  vegetables: "Gemüse",
  milk: "Milch",
  meat: "Fleisch",
  cheese: "Käse",
  yoghurt: "Joghurt",
  alcohol: "Alkoholische Getränke",
  juice: "Säfte",
  fish: "Fisch"
};



// ── SELECT ───────────────────────────────────────────────────────────
function selectFarm(farm, i) {
  // Deselect old
  if (activeCard !== null) {
    const oldCard = document.getElementById(`card-${activeCard}`);
    if (oldCard) oldCard.classList.remove('active');
    const oldIcon = document.getElementById(`marker-icon-${activeCard}`);
    if (oldIcon) oldIcon.classList.remove('active');
  }

  activeCard = i;
  const card = document.getElementById(`card-${i}`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const icon = document.getElementById(`marker-icon-${i}`);
  if (icon) icon.classList.add('active');

  map.setView([farm.lat, farm.lng], 15, { animate: true });
  markers[i].openPopup();
}

// ── FILTER ───────────────────────────────────────────────────────────
function filterAll(btn) {
  activeFilter = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  renderAll(farms);
  fitMap(farms);
}

function filterByProduct(product, btn) {
  activeFilter = product;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  const filtered = farms.filter(f =>
    f.products.map(p => p.trim()).includes(product)
  );
  renderAll(filtered);
  if (filtered.length) fitMap(filtered);
}

function filterByBio(btn) {
  activeFilter = 'bio';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  const filtered = farms.filter(f => f.bio === '1');
  renderAll(filtered);
  if (filtered.length) fitMap(filtered);
}

function fitMap(subset) {
  const bounds = L.latLngBounds(subset.map(f => [f.lat, f.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });
}

// ── CSV LOADING ─────────────────────────────────────────────────────────
function loadCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const data = parseCSV(text);
    if (data.length === 0) {
      alert('No valid rows found. Check your CSV format matches the template.');
      return;
    }
    document.querySelector('.demo-banner').style.display = 'none';
    loadData(data);
  };
  reader.readAsText(file);
  event.target.value = '';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_').replace(/"/g,''));
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''));
    return {
      name: obj.name || obj.farm_name || '',
      address: obj.address || '',
      lat: parseFloat(obj.lat || obj.latitude || 0),
      lng: parseFloat(obj.lng || obj.lon || obj.longitude || 0),
      phone: obj.phone || obj.tel || '',
      email: obj.email || '',
      website: obj.website || obj.web || '',
      bio: obj.bio || '',
     products: Object.keys(PRODUCT_LABELS)
    .filter(key => obj[key] === '1')

    };
  }).filter(f => f.name && !isNaN(f.lat) && !isNaN(f.lng) && f.lat !== 0);
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}
