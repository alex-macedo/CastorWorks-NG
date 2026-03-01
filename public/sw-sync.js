// Background Sync handler for queued actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueuedActions());
  }
});

async function syncQueuedActions() {
  try {
    // Open IndexedDB
    const db = await openDatabase();
    const actions = await getQueuedActions(db);
    
    console.log(`[Service Worker] Syncing ${actions.length} queued actions`);
    
    const results = await Promise.allSettled(
      actions.map(action => processAction(action, db))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[Service Worker] Sync complete: ${successful} successful, ${failed} failed`);
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        successful,
        failed,
        total: actions.length
      });
    });
    
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    throw error;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sync-queue-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
    };
  });
}

async function getQueuedActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function processAction(action, db) {
  const MAX_RETRIES = 3;
  
  try {
    // Process the action based on type
    await executeAction(action);
    
    // Remove from queue on success
    await removeFromQueue(db, action.id);
    
    return { success: true, action };
  } catch (error) {
    console.error(`[Service Worker] Failed to process action ${action.id}:`, error);
    
    if (action.retries < MAX_RETRIES) {
      // Update retry count
      await updateRetries(db, action.id);
      throw error; // Will trigger background sync retry
    } else {
      // Max retries reached, remove from queue
      await removeFromQueue(db, action.id);
      throw new Error(`Max retries reached for action ${action.id}`);
    }
  }
}

async function executeAction(action) {
  const { type, payload } = action;
  
  // Get the base URL from environment or default
  const baseUrl = self.registration.scope;
  
  // Map action types to API endpoints
  const endpoints = {
    'CREATE': '/api/create',
    'UPDATE': '/api/update',
    'DELETE': '/api/delete',
    // Add more endpoints as needed
  };
  
  const endpoint = endpoints[type];
  if (!endpoint) {
    console.warn(`[Service Worker] Unknown action type: ${type}`);
    return;
  }
  
  // Make the API call
  const response = await fetch(baseUrl + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

async function removeFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function updateRetries(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.retries = (action.retries || 0) + 1;
        const putRequest = store.put(action);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}
