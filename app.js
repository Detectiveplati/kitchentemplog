let fileHandle = null;
let cooks = [];
let globalTimerId = null;
let currentStaff = null;  // 'Alice', 'Bob', 'Charlie' or null

const activeGrid = document.getElementById('active-grid');
const statusEl = document.getElementById('status');
const recentBody = document.getElementById('recent-body');

function setGlobalStaff(staff) {
  currentStaff = staff;
  document.querySelectorAll('.staff-btn').forEach(btn => {
    btn.classList.remove('staff-selected');
  });
  document.getElementById(`staff-${staff}`).classList.add('staff-selected');
  statusEl.textContent = `Current staff set to: ${staff}`;
}

async function getOrCreateCSVFile() {
  if (fileHandle) return fileHandle;
  try {
    [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'CSV Files', accept: {'text/csv': ['.csv']} }]
    });
  } catch {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'deep_fry_cooking_log.csv',
      types: [{ description: 'CSV File', accept: {'text/csv': ['.csv']} }]
    });
    const w = await fileHandle.createWritable();
    await w.write(
      "Food Item,Start Date,Start Time,End Date,End Time,Duration (min),Core Temp (°C),Staff,Trays\n"
    );
    await w.close();
  }
  await loadRecent();
  return fileHandle;
}

function addNewCook(food) {
  if (!currentStaff) {
    alert("Please select a staff member (Alice, Bob, or Charlie) first.");
    return;
  }

  const id = Date.now();
  cooks.push({
    id,
    food,
    startTime: null,
    endTime: null,
    duration: null,
    temp: '',
    trays: '',
    timerRunning: false
  });
  renderActiveCooks();
  statusEl.textContent = `Added ${food} by ${currentStaff} — press Start when ready.`;
}

function renderActiveCooks() {
  activeGrid.innerHTML = '';
  cooks.forEach(cook => {
    const card = document.createElement('div');
    card.className = 'cook-card';
    card.innerHTML = `
      <h3>${cook.food}</h3>
      <div class="timer-display ${cook.endTime ? 'finished' : ''}" id="timer-${cook.id}">
        ${cook.startTime ? formatElapsed(cook) : 'Not started'}
      </div>
      <div class="info-row">
        <strong>Staff:</strong> ${currentStaff || '(not set)'}
      </div>
      ${!cook.startTime ? `<button class="start-btn" onclick="startCook(${cook.id})">START COOKING</button>` : ''}
      ${cook.startTime && !cook.endTime ? `<button class="end-btn" onclick="endCook(${cook.id})">END COOKING</button>` : ''}
      ${cook.endTime ? `
        <div class="info-row">
          <input type="number" step="0.1" min="0" max="150" placeholder="Core °C" value="${cook.temp}" onchange="updateTemp(${cook.id}, this.value)">
          <input type="number" min="1" step="1" placeholder="Trays" value="${cook.trays}" onchange="updateTrays(${cook.id}, this.value)">
          <button class="save-btn" onclick="saveCook(${cook.id})">SAVE</button>
        </div>
      ` : ''}
      <button class="back-btn" onclick="removeCook(${cook.id})">Cancel / Remove</button>
    `;
    activeGrid.appendChild(card);
  });
}

function formatElapsed(cook) {
  if (!cook.startTime) return '00:00';
  if (cook.endTime) return `${cook.duration} min`;
  const sec = Math.floor((Date.now() - cook.startTime) / 1000);
  const m = String(Math.floor(sec / 60)).padStart(2,'0');
  const s = String(sec % 60).padStart(2,'0');
  return `${m}:${s}`;
}

function startCook(id) {
  const cook = cooks.find(c => c.id === id);
  if (!cook || cook.startTime) return;
  cook.startTime = Date.now();
  cook.timerRunning = true;
  renderActiveCooks();
  startGlobalTimer();
}

function endCook(id) {
  const cook = cooks.find(c => c.id === id);
  if (!cook || !cook.startTime || cook.endTime) return;
  const now = Date.now();
  cook.endTime = now;
  const sec = (now - cook.startTime) / 1000;
  cook.duration = (sec / 60).toFixed(1);
  cook.timerRunning = false;
  renderActiveCooks();
  checkAllTimers();
}

function updateTemp(id, value) {
  const cook = cooks.find(c => c.id === id);
  if (cook) cook.temp = value.trim();
}

function updateTrays(id, value) {
  const cook = cooks.find(c => c.id === id);
  if (cook) cook.trays = value.trim();
}

async function saveCook(id) {
  const cook = cooks.find(c => c.id === id);
  if (!cook || !cook.endTime || !cook.temp || isNaN(parseFloat(cook.temp))) {
    alert("End cooking first and enter valid core temperature.");
    return;
  }
  if (!cook.trays || isNaN(parseInt(cook.trays)) || parseInt(cook.trays) < 1) {
    alert("Please enter a valid number of trays (≥ 1).");
    return;
  }
  if (!currentStaff) {
    alert("No staff selected. Please choose Alice, Bob, or Charlie at the top.");
    return;
  }

  const start = new Date(cook.startTime);
  const end   = new Date(cook.endTime);

  const startDate = start.toISOString().split('T')[0];
  const startTime = start.toISOString().split('T')[1].slice(0, 8);
  const endDate   = end.toISOString().split('T')[0];
  const endTime   = end.toISOString().split('T')[1].slice(0, 8);

  const row = [
    `"${cook.food.replace(/"/g, '""')}"`,
    startDate,
    startTime,
    endDate,
    endTime,
    cook.duration,
    cook.temp,
    currentStaff,
    cook.trays
  ].join(',');

  const file = await getOrCreateCSVFile();
  if (file) {
    const writable = await file.createWritable({ keepExistingData: true });
    await writable.seek((await file.getFile()).size);
    await writable.write(row + '\n');
    await writable.close();
    await loadRecent();
    statusEl.textContent = `${cook.food} (${cook.trays} trays) saved ✓`;
  }

  removeCook(id);
}

function removeCook(id) {
  cooks = cooks.filter(c => c.id !== id);
  renderActiveCooks();
  checkAllTimers();
}

function startGlobalTimer() {
  if (globalTimerId) return;
  globalTimerId = setInterval(() => {
    let anyRunning = false;
    cooks.forEach(cook => {
      if (cook.startTime && !cook.endTime) {
        anyRunning = true;
        const el = document.getElementById(`timer-${cook.id}`);
        if (el) el.textContent = formatElapsed(cook);
      }
    });
    if (!anyRunning) {
      clearInterval(globalTimerId);
      globalTimerId = null;
    }
  }, 1000);
}

function checkAllTimers() {
  const running = cooks.some(c => c.startTime && !c.endTime);
  if (!running && globalTimerId) {
    clearInterval(globalTimerId);
    globalTimerId = null;
  }
}

async function loadRecent() {
  if (!fileHandle) return;
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1).reverse().slice(0, 8);

    recentBody.innerHTML = '';
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      if (parts.length < 9) return;

      const food   = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      const sDate  = parts[1] || '';
      const sTime  = parts[2] || '';
      const eDate  = parts[3] || '';
      const eTime  = parts[4] || '';
      const dur    = parts[5] || '';
      const temp   = parts[6] || '';
      const staff  = parts[7] || '';
      const trays  = parts[8] || '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="food-col">${food}</td>
        <td>${sDate}</td>
        <td>${sTime}</td>
        <td>${eDate}</td>
        <td>${eTime}</td>
        <td class="small-col">${dur}</td>
        <td class="small-col">${temp}</td>
        <td class="small-col">${staff}</td>
        <td class="small-col">${trays}</td>
      `;
      recentBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading recent:", err);
  }
}

async function exportFullCSV() {
  if (fileHandle) {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deep_fry_cooking_log.csv';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    alert("No log file selected yet.");
  }
}

// Initialize
getOrCreateCSVFile();