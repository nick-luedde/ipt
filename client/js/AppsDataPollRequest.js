/**
 * Creates new apps data poll request obj
 * @param {Object} options - options
 * @param {Function} options.pollfn - poll function to exec
 * @param {number} [options.interval] - optional poll interval (ignored if long)
 * @param {boolean} [options.long] - optional flag for long polling
 * @param {boolean} [options.logging] - optional flagg for logging (console logs)
 */
const AppsDataPollRequest = ({
  pollfn,
  interval = 1000 * 60 * 10,
  long = true,
  logging = false
}) => {

  if (typeof pollfn !== 'function')
    throw new Error('pollfn arg must be of type function!');

  // ignore interval if this is long-polling (meaning a new poll request will be sent immediately after on returns)
  interval = !!long ? 0 : interval;

  /**
   * 1. Keep track of when polling happens [done]
   * 2. Poll at a (cancellable) interval [doneish]
   * 3. Only poll if browser is active (configurable?) [done]
   * 4. Server side could handle some poll caching (like timing for when datasources where last updated...)
   */

  const context = {
    state: 'init',
    pending: false,
    errorcount: 0
  };

  const MAX_ERRORS_BEFORE_QUIT = 3;

  /**
   * Handler function for managing polling status when the browser becomes inactive
   */
  const inactiveHandler = () => {
    const isActive = document.visibilityState === 'visible';

    console.log(`%c${document.visibilityState}`, `color: ${isActive ? 'green' : 'red' };`); //DEBUG

    if (isActive && context.state === 'paused' && !context.pending) {
      sched.start();
    } else if (isActive && context.state === 'paused') {
      sched.unpause();
    } else if (!isActive && context.state === 'active') {
      sched.cancel();
      sched.pause();
      if (closefn && typeof closefn === 'function')
        closefn();
    }
  };

  /**
   * Activates inactive poll handler
   */
  const sleep = () => {
    document.addEventListener('visibilitychange', inactiveHandler);
    return api;
  };

  /**
   * Deactivates inactive poll handler
   */
  const awake = () => {
    document.removeEventListener('visibilitychange', inactiveHandler);
    return api;
  };

  /**
   * Execs polling based on polling state
   */
  const poll = async () => {
    if (logging)
      console.log('poll()', context);

    if (context.state === 'active') {
      try {
        context.pending = true;
        const response = await pollfn(context.lastPoll);
        context.pending = false;
        context.errorcount = 0;
        //Recheck for state after async call
        if (context.state === 'active')
          sched.start();

        return response;
      } catch (err) {
        context.errorcount++;
        if (context.errorcount < MAX_ERRORS_BEFORE_QUIT) {
          sched.start();
        } else {
          context.errorcount = 0;
          sched.cancel();
          console.warn(`Scheduled polling failed ${MAX_ERRORS_BEFORE_QUIT} time(s) and was cancelled. Call the start() method to restart polling.`);
        }

        throw err;
      }

    }

  };

  /**
   * Handles scheduled polling states/actions
   */
  const scheduler = () => {
    let id;

    /**
     * Starts the polling schedule
     * @param {Object} options 
     * @param {Object} [options.immediate] - flag for sending the poll request immediately 
     */
    const start = ({ immediate = false } = {}) => {
      context.state = 'active';

      if (id)
        clearTimeout(id);

      id = setTimeout(api.poll, immediate ? 0 : interval);
      messageEvent();

      if (logging)
        console.log('scheduler.start()');

      return id;
    };

    /**
     * Pauses the schedule
     */
    const pause = () => {
      context.state = 'paused';
      messageEvent();

      if (logging)
        console.log('scheduler.pause()');
    };

    /**
     * Unpauses the schedule
     */
    const unpause = () => {
      context.state = 'active';
      messageEvent();

      if (logging)
        console.log('scheduler.unpause()');
    };

    /**
     * Cancels the schedule
     */
    const cancel = () => {
      if (id)
        clearTimeout(id);
      context.state = 'cancelled';
      messageEvent();

      if (logging)
        console.log('scheduler.cancel()');
    };

    return {
      start,
      pause,
      unpause,
      cancel,
      status: () => context.state
    };
  };

  const sched = scheduler();

  let closefn;
  /**
   * Sets a handler callback for when the poller disconnects (cancels)
   * @param {Function} fn - callback function to for on disconnect
   */
  const onDisconnect = (fn) => {
    closefn = fn;
    return api;
  };

  let messageHandler;
  /**
   * Sets handler callback for polling messages (recieving responses)
   * @param {Function} fn - callback function for on message
   */
  const onMessage = (fn) => {
    messageHandler = fn;
    return api;
  };

  /**
   * Helper to exec message handler function if it exists
   */
  const messageEvent = () => {
    if (messageHandler && typeof messageHandler === 'function')
      messageHandler({ ...context });
  };

  const api = {
    poll,
    sleep,
    awake,
    scheduler: sched,
    onDisconnect,
    onMessage
  };

  return api;

};