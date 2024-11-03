class AppsDiscreteOperation {
  
  /** @param {'user' | 'script' | 'document'} type */
  static setup(type = 'script') {
    const context = {
      retry: 0,
      /** @type {Error | null} */
      error: null,
      sec: 20,
      aquired: false,
      complete: false,
      onAcquired: null,
      onFailure: null,
      returnValue: null
    };

    const reset = () => {
      context.aquired = false;
      context.complete = false;
      context.returnValue = null;
      return api;
    };

    const types = {
      'user': LockService.getUserLock,
      'script': LockService.getScriptLock,
      'document': LockService.getDocumentLock
    };

    const setupLock = () => {
      const lockType = types[type];
      if (!lockType) throw new Error(`${type} is not a valid lock type!`);

      return lockType();
    };

    const lock = setupLock();

    const aquire = () => lock.tryLock(context.sec * 1000);
    const test = lock.hasLock;

    const handleIfLockAquired = () => {
      if (context.aquired && context.onAcquired) {
        context.returnValue = context.onAcquired();
        end();
      }
    };

    const handleIfLockFailed = () => {
      if (!context.aquired && context.complete) {
        if (context.onFailure) context.onFailure()
        end();
      }
    };

    /** @param {number} num */
    const retry = (num) => {
      context.retry = num;
      return api;
    };

    /** @param {Error} [err] */
    const error = (err) => {
      context.error = err || new Error('Could not peform discrete action, try again!');
      return api;
    };

    /** @param {number} sec */
    const wait = (sec) => {
      context.sec = sec;
      return api;
    };

    const start = () => {
      let count = 0;
      while (count <= context.retry && !context.aquired) {
        context.aquired = aquire();
        count++;
      }

      context.complete = true;
      handleIfLockAquired();
      handleIfLockFailed();

      return api;
    };

    /** @template T */
    /** @param {() => T} callback */
    const operation = (callback) => {
      if (!callback || typeof callback !== 'function')
        throw new Error('callback arg must be of type Function!');

      context.onAcquired = callback;
      handleIfLockAquired();

      return api;
    };

    /** @param {() => void} callback */
    const failure = (callback) => {
      if (!callback || typeof callback !== 'function')
        throw new Error('callback arg must be of type Function!');

      context.onFailure = callback;
      handleIfLockFailed();

      return api;
    };

    const end = () => {
      lock.releaseLock();
      if (context.error && !context.aquired)
        throw context.error;

      return api;
    };

    /** @returns {T} */
    const resolution = () => context.returnValue;

    const api = {
      reset,
      retry,
      error,
      wait,
      start,
      operation,
      failure,
      test,
      end,
      resolution
    };

    return api;
  }

}