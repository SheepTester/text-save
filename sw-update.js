if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data.reload) {
      console.log('New service worker; reloading.', e.data.v);
      window.location.reload();
    }
  });
  navigator.serviceWorker.register('/text-save/sw.js');
}
