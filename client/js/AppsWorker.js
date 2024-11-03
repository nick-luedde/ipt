const AppsWorker = (id) => {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
  const script = document.querySelector(`#${id}`);
  if (!script)
    throw new Error(`<script> with id ${id} not found!`);

  if (script.getAttribute('type') !== 'text/js-worker')
    throw new Error(`<script> with id ${id} has the incorrect 'type' should be 'text/js-worker'!`);

  const blob = new Blob([script.textContent]);
  const worker = new Worker(window.URL.createObjectURL(blob));

  const exec = async (action, ...args) => {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const handler = (e) => {
        if (e.data.id === id) {
          worker.removeEventListener('message', handler);
          resolve(e.data.result);
        }
      };

      const err = (error) => {
        worker.removeEventListener('error', err);
        reject(error);
      };

      worker.addEventListener('error', err);
      worker.addEventListener('message', handler);

      worker.postMessage({
        id,
        action,
        args
      });
    });
  };

  return {
    exec,
    worker
  };
};