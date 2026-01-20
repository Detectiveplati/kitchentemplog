// ============================================================
// DATA LAYER - Handles all persistence (CSV, Database, API)
// This abstraction allows easy migration from CSV to MongoDB
// ============================================================

let fileHandle = null;
let currentCSVFilename = 'deepfry.csv';  // Default filename
let FILE_HANDLE_KEY = 'deepfry_csv_handle';  // Will be updated based on filename

// Initialize the data layer
async function initializeData(csvFilename = 'deepfry.csv') {
  currentCSVFilename = csvFilename;
  FILE_HANDLE_KEY = `${csvFilename.replace('.csv', '')}_handle`;
  
  // Request persistent storage permission
  if (navigator.storage && navigator.storage.persist) {
    const isPersistent = await navigator.storage.persist();
    console.log('Persistent storage granted:', isPersistent);
  }
  await getOrCreateCSVFile();
}

// Get or create deepfry.csv file in departments folder
async function getOrCreateCSVFile() {
  if (fileHandle) return fileHandle;

  // Try to restore from previous session
  try {
    const storedHandle = await restoreFileHandle();
    if (storedHandle) {
      fileHandle = storedHandle;
      return fileHandle;
    }
  } catch (err) {
    console.log("Could not restore file handle, will prompt for " + currentCSVFilename);
  }

  // Prompt user to select CSV file from departments folder (only once)
  try {
    [fileHandle] = await window.showOpenFilePicker({
      suggestedName: currentCSVFilename,
      types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
      _preferredStartingDirectory: 'departments'
    });
  } catch (err) {
    throw err;
  }

  // Save handle for next session (auto-loads after this)
  try {
    await saveFileHandle(fileHandle);
  } catch (err) {
    console.log("Could not save file handle for next session");
  }

  return fileHandle;
}

// Save file handle to IndexedDB for persistence
async function saveFileHandle(handle) {
  const db = await openIndexedDB();
  const tx = db.transaction('fileHandles', 'readwrite');
  tx.objectStore('fileHandles').put({ key: FILE_HANDLE_KEY, handle });
}

// Restore file handle from IndexedDB
async function restoreFileHandle() {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fileHandles', 'readonly');
      const req = tx.objectStore('fileHandles').get(FILE_HANDLE_KEY);
      req.onsuccess = () => {
        const handle = req.result?.handle;
        if (handle) {
          // Verify handle is still valid
          handle.getFile().then(() => {
            resolve(handle);
          }).catch(() => {
            // Handle is stale
            resolve(null);
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.log("Could not restore file handle:", err);
    return null;
  }
}

// Open or create IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('KitchenLogDB', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('fileHandles')) {
        db.createObjectStore('fileHandles', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Save cook data to CSV (currently) or API (future MongoDB)
async function saveCookData(cookData) {
  // Currently using CSV
  // TODO: When migrating to MongoDB, change to:
  // return fetch('/api/cooks', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(cookData)
  // }).then(res => res.json());

  const row = [
    `"${cookData.food.replace(/"/g, '""')}"`,
    cookData.startDate,
    cookData.startTime,
    cookData.endDate,
    cookData.endTime,
    cookData.duration,
    cookData.temp,
    cookData.staff,
    cookData.trays
  ].join(',');

  const file = await getOrCreateCSVFile();
  if (file) {
    const writable = await file.createWritable({ keepExistingData: true });
    await writable.seek((await file.getFile()).size);
    await writable.write(row + '\n');
    await writable.close();
  }

  return true;
}

// Load recent cook entries
async function loadRecentCookData() {
  // Currently using CSV
  // TODO: When migrating to MongoDB, change to:
  // return fetch('/api/cooks?limit=8&sort=desc')
  //   .then(res => res.json());

  if (!fileHandle) return [];

  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1).reverse().slice(0, 8);

    return lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(',');
        if (parts.length < 9) return null;

        return {
          food: parts[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim(),
          startDate: parts[1] || '',
          startTime: parts[2] || '',
          endDate: parts[3] || '',
          endTime: parts[4] || '',
          duration: parts[5] || '',
          temp: parts[6] || '',
          staff: parts[7] || '',
          trays: parts[8] || ''
        };
      })
      .filter(item => item !== null);
  } catch (err) {
    console.error("Error loading recent data:", err);
    return [];
  }
}

// Export full CSV (keep this for CSV mode)
async function exportFullCSVData() {
  // TODO: When using MongoDB, you might want to export via API
  // return fetch('/api/cooks/export').then(res => res.blob());

  if (fileHandle) {
    const file = await fileHandle.getFile();
    const text = await file.text();
    return new Blob([text], { type: 'text/csv;charset=utf-8;' });
  } else {
    throw new Error("No log file selected yet.");
  }
}
