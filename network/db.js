// ═══════════════════════════════════════════════════════════
// DB — Wrapper IndexedDB (Promise-based, estilo Laravel Eloquent)
// ═══════════════════════════════════════════════════════════
// Uso:
//   await DB.init();
//   await DB.put('cache', { key: 'filas', data: [...] });
//   const cached = await DB.get('cache', 'filas');
//   await DB.delete('cache', 'filas');
//   const all = await DB.getAll('cache');
//   await DB.clear('cache');
// ═══════════════════════════════════════════════════════════

var DB = (function() {

  var DB_NAME = 'pje-sejud-cariri';
  var DB_VERSION = 1;
  var _db = null;

  // ── Stores (tabelas) ──
  var STORES = {
    cache: { keyPath: 'key' },        // cache genérico: { key, data, ts }
    processos: { keyPath: 'numero' }, // dados de processos
    filas: { keyPath: 'nome' },       // dados de filas
    scrap: { keyPath: 'url' }         // HTML scrapado: { url, html, ts }
  };

  function init() {
    return new Promise(function(resolve, reject) {
      if (_db) return resolve(_db);
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        for (var name in STORES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: STORES[name].keyPath });
          }
        }
      };
      req.onsuccess = function(e) { _db = e.target.result; resolve(_db); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function _tx(store, mode) {
    return _db.transaction(store, mode || 'readonly').objectStore(store);
  }

  function get(store, key) {
    return init().then(function() {
      return new Promise(function(resolve, reject) {
        var req = _tx(store).get(key);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function put(store, value) {
    return init().then(function() {
      return new Promise(function(resolve, reject) {
        var req = _tx(store, 'readwrite').put(value);
        req.onsuccess = function() { resolve(value); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function getAll(store) {
    return init().then(function() {
      return new Promise(function(resolve, reject) {
        var req = _tx(store).getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function _delete(store, key) {
    return init().then(function() {
      return new Promise(function(resolve, reject) {
        var req = _tx(store, 'readwrite').delete(key);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function clear(store) {
    return init().then(function() {
      return new Promise(function(resolve, reject) {
        var req = _tx(store, 'readwrite').clear();
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  // ── Cache helper (TTL em ms) ──
  async function cacheGet(key, ttl) {
    var item = await get('cache', key);
    if (!item) return null;
    if (ttl && Date.now() - (item.ts || 0) > ttl) return null; // expirado
    return item.data;
  }

  async function cachePut(key, data) {
    return put('cache', { key: key, data: data, ts: Date.now() });
  }

  return {
    init: init,
    get: get,
    put: put,
    getAll: getAll,
    delete: _delete,
    clear: clear,
    cacheGet: cacheGet,
    cachePut: cachePut,
    STORES: Object.keys(STORES)
  };
})();
