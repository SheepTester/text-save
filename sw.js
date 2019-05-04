const CACHE_NAME = 'text-save-cache';
const DB_NAME = 'text-save';
const urlsToCache = [
  './style.css',
  './main.js',
  './dir.html',
  './template.html',
  './invalid-id.html',
  './basic.css'
];
const validIDRegex = /^[^.]+$/;
let textSaveTemplate;

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
  return promisify(getNotes(db).getAllKeys()).then(({content}) => content);
}

function read(db, id) {
  return promisify(getNotes(db).get(id)).then(({content}) => content);
}

function write(db, id, content) {
  return promisify(getNotes(db, 'readwrite').put({id, content}));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(urlsToCache))
    .then(() => self.skipWaiting()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  e.respondWith(location.host !== url.host ? fetch(e.request) : caches.match(e.request).then(async res => {
    if (res) return res;
    const id = url.pathname.replace('/text-save', '').replace('/', '');
    if (!validIDRegex.test(id)) return caches.match('./invalid-id.html');
    if (!textSaveTemplate) {
      template = await caches.match('./template.html').then(r => r.text());
    }
    return new Response(
      template
        .replace(/%id%/g, id)
        .replace(/%content%/g, (await read(await db, id).catch(() => ''))
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')),
      {headers: {'Content-Type': 'text/html'}}
    );
  }));
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('message', e => {
  if (e.data.id) {
    db.then(db => write(db, e.data.id, e.data.content));
  } else {
    console.log(e.data);
  }
});
