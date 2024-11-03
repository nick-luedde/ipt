const useAsyncQueueDebouncedAutosave = (saveFn, ms = 2500) => {
  // 'imports' from Vue
  const {
    ref,
  } = Vue;

  // https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-the-promise-constructor-scope
  function Deferred() {
    const self = this;
    this.promise = new Promise((resolve, reject) => {
      self.resolve = resolve;
      self.reject = reject;
    });
  }

  const queue = ref([]);
  const inProgress = ref(false);
  const closeQueue = ref(false);

  const MAX_RETRIES = 20;
  const autosaveRetryCount = ref(0);
  const autosavedAt = ref('');
  const isAutosaving = ref(false);
  const autosaveError = ref('');
  const cancelAutosave = ref(false);

  const DEBOUNCE_MS = ms;

  /**
   * Dequeues all functions
   */
  const dequeue = async () => {
    const q = queue.value;

    let [next] = q;
    while (next) {
      
      try {
        const res = await next.fn();
        next.def.resolve(res);
      } catch (error) {
        next.def.reject(error);
      }

      q.shift();
      [next] = q;
    }
    inProgress.value = false;
  };
  
  /**
   * Pushes a function onto the queueu
   * @param {Function} fn - function to enqueue
   */
  const enqueue = (fn) => {
    if (closeQueue.value)
      return;

    const def = new Deferred();
    
    queue.value.push({ fn, def });

    if (!inProgress.value) {
      inProgress.value = true;
      dequeue();
    }

    return def.promise;
  }

  /**
   * Debounced autosaver function
   */
  const autosave = debounce(async () => {
    if (cancelAutosave.value) {
      autosaveRetryCount.value = 0;
      return;
    }

    //Don't overlap on saves, keep debouncing till clear
    if (isAutosaving.value) {
      if (autosaveRetryCount.value >= MAX_RETRIES) {
        autosaveError.value = 'Autosaving timed out, please try again. If it still times out contact your system admin!';
        autosaveRetryCount.value = 0;
        return;
      }

      autosaveRetryCount.value += 1;
      autosave();
      return;
    }

    isAutosaving.value = true;

    await enqueue(saveFn);

    autosavedAt.value = Date.now();
    autosaveRetryCount.value = 0;
    isAutosaving.value = false;

  }, DEBOUNCE_MS);


  return {
    queue,
    inProgress,
    closeQueue,
    enqueue,
    autosaveRetryCount,
    autosavedAt,
    isAutosaving,
    autosaveError,
    cancelAutosave,
    autosave
  }
};