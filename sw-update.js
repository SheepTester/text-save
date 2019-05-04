if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    console.log('New service worker; reloading.');
    if (e.data.reload) window.location.reload();
  });
  navigator.serviceWorker.register('./sw.js');
}
