function ready() {
  const textarea = document.getElementById('text');
  const id = textarea.dataset.id;
  textarea.addEventListener('input', e => {
    navigator.serviceWorker.controller.postMessage({id, content: textarea.value});
  });
}
