const CACHE_NAME = 'text-save-cache-v1.3';
const DB_NAME = 'text-save';
const urlsToCache = [
  './style.css',
  './main.js',
  './dir.html',
  './template.html',
  './invalid-id.html',
  './basic.css',
  './sw-update.js'
];
const validIDRegex = /^[^.?#/]+$/;
let template, dirTemplate;

const db = new Promise((res, rej) => {
  const dbReq = indexedDB.open(DB_NAME);
  dbReq.addEventListener('success', e => res(e.target.result));
  dbReq.addEventListener('upgradeneeded', e => {
    const db = e.target.result;
    db.createObjectStore('notes', {keyPath: 'id'});
  });
  dbReq.addEventListener('error', rej);
});

function promisify(eventTarget) {
  return new Promise((res, rej) => {
    eventTarget.addEventListener('success', e => res(e.target.result));
    eventTarget.addEventListener('error', rej);
  });
}

function getNotes(db, perms = 'readonly') {
  return db.transaction(['notes'], perms).objectStore('notes');
}

function keys(db) {
  return promisify(getNotes(db).getAllKeys());
}

function read(db, id) {
  return promisify(getNotes(db).get(id)).then(({content}) => content);
}

function write(db, id, content) {
  return promisify(getNotes(db, 'readwrite').put({id, content}));
}

function escape(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(urlsToCache))
    .then(() => self.skipWaiting()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (location.host !== url.host || url.pathname.indexOf('/text-save/') !== 0) {
    return e.respondWith(fetch(e.request));
  }
  e.respondWith(caches.match(e.request).then(async res => {
    if (res) return res;
    const id = decodeURIComponent(url.pathname.replace('/text-save/', ''));
    if (!id) {
      if (!dirTemplate) {
        dirTemplate = await caches.match('./dir.html').then(r => r.text());
      }
      const ids = await keys(await db);
      return new Response(
        dirTemplate.replace(/\{key ([^}]+)\}/g, (m, html) => {
          return ids.map(id => html.replace(/%id%/g, escape(id)));
        }),
        {headers: {'Content-Type': 'text/html'}}
      );
    }
    if (!validIDRegex.test(id)) return caches.match('./invalid-id.html');
    if (!template) {
      template = await caches.match('./template.html').then(r => r.text());
    }
    return new Response(
      template
        .replace(/%id%/g, escape(id))
        .replace(/%content%/g, escape(await read(await db, id).catch(() => ''))),
      {headers: {'Content-Type': 'text/html'}}
    );
  }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(names => Promise.all(names.map(cache => CACHE_NAME !== cache && caches.delete(cache))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll())
    .then(clients => clients.forEach(client => client.postMessage({reload: true, v: CACHE_NAME}))));
});
self.addEventListener('message', e => {
  if (e.data.id) {
    db.then(db => write(db, e.data.id, e.data.content));
  } else {
    console.log(e.data);
  }
});
