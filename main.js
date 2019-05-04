function ready(id) {
  const textarea = document.getElementById('text');
  textarea.addEventListener('input', e => {
    navigator.serviceWorker.controller.postMessage({id, content: textarea.value});
  });
}
