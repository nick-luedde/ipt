/**
 * @typedef {Object} AppsDataPollUpdate
 * @property {String} sess - update session id
 * @property {Number} ts - timestamp
 * @property {String} model - model name (ie Item, Project, Contact, etc..)
 * @property {Object} rec - updated record
 * @property {Boolean} del - is a delete record
 */

class AppsDataPoll {

  /**
   * Creates new apps data poll obj
   * @param {Object} options - options
   * @param {boolean} [options.logging] - optional loggin flag (just for console logs, primarily for debugging)
   * @param {string} [options.cachePrefix] - optional cache prefix, useful to separate dev from prod
   * @param {number} [options.cacheSeconds] - optional seconds to maintain updates in cache
   * @param {number} [options.longPollSeconds] - optional seconds to keep a single long polling session alive
   */
  static create({ logging = false, cachePrefix = '', cacheSeconds = 60 * 6, longPollSeconds = 60 * 4 } = {}) {

    /**
     * 1. Can determine if there is new data to be returned...
     * 2. Manages cached metadata for polling (i.e. last time something was updated)
     * 3. Caches recent updates for incremental long polls
     */
    const context = {
      updates: {},
    };

    const POLL_CACHE_LENGTH_SECONDS = cacheSeconds;
    const POLL_CACHE_KEY = `${cachePrefix || ''}__data_poll_cache`;
    const LONG_POLL_WAIT_SECONDS = longPollSeconds;

    /**
     * Creates cacheing functional object for managing the data poll cache
     */
    const caching = () => {
      const cache = CacheService.getScriptCache();

      /**
       * Loads the latest data into the context
       */
      const load = () => {

        const MAX_LOOPS = 100;
        let str = '';

        let i = 0;
        let cached = cache.get(`${POLL_CACHE_KEY}-${i}`);
        while (!!cached && i <= MAX_LOOPS) {
          str += cached;

          i++;
          cached = cache.get(`${POLL_CACHE_KEY}-${i}`);
        }

        context.updates = JSON.parse(str || '{}');

        return context.updates;
      };

      /**
       * Spreads the data into cache buckets as needed
       * @param {Object} data - poll cache data to spread
       */
      const spreadCacheData = (data) => {
        const BLOCK_SIZE = 100000;
        const str = JSON.stringify(data);

        const len = str.length;
        const blockCount = Math.ceil(len / BLOCK_SIZE);

        const blocks = new Array(blockCount).fill(null)
          .map((_, i) => str.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE));

        blocks.forEach((b, index) => {
          cache.put(`${POLL_CACHE_KEY}-${index}`, b, POLL_CACHE_LENGTH_SECONDS);
        });

      };

      /**
       * Puts info into the data poll cache
       * @param {Object} info - info to set to data poll cache 
       */
      const set = ({ session, records }) => {
        const now = Date.now();

        /*
        {
          Item: {
            [id + session]: {
              session
              ts,
              del
              item
            }
          },
          Project: {
            [id + session]: {
              session
              ts,
              del
              project
            }
          }
        }
        */

        const lock = LockService.getScriptLock();
        lock.waitLock(1000 * 20);

        load();

        records.forEach(({ model, id, record, del }) => {
          if (!context.updates[model])
            context.updates[model] = {};

          context.updates[model][id + session] = {
            sess: session,
            rec: record,
            del,
            ts: now
          };
        });

        const cutoff = Date.now() - (POLL_CACHE_LENGTH_SECONDS * 1000);
        Object.keys(context.updates).forEach(model => {
          const updates = context.updates[model];
          Object.keys(updates).forEach(key => {
            const u = updates[key];
            if (!u || u.ts < cutoff)
              updates[key] = undefined;
          });
        });

        empty();
        spreadCacheData(context.updates);

        lock.releaseLock();

        if (logging)
          console.log('cache.set()');
      };

      /**
       * Session info object for managing cache sessions from client
       */
      const sessionInfo = {
        TIMEOUT: 60 * 60 * 1,
        cacheid: (session) => `_poll_sess_${session}`,

        get(session) {
          const raw = cache.get(sessionInfo.cacheid(session));
          if (!raw)
            return { lastSuccess: -Infinity };

          const info = JSON.parse(raw);
          info.lastSuccess = (info.lastSuccess === undefined) ? -Infinity : info.lastSuccess;
          return info;
        },

        set(session, { ts, cancel }) {
          const info = JSON.stringify({ lastSuccess: ts, cancel });
          cache.put(sessionInfo.cacheid(session), info, sessionInfo.TIMEOUT);
        },

        clear(session) {
          cache.remove(sessionInfo.cacheid(session));
        },

        stale(session) {
          const info = sessionInfo.get(session)
          return ((Date.now() - info.lastSuccess) / 1000) > POLL_CACHE_LENGTH_SECONDS;
        }
      };

      /**
       * Emptys the data poll cache
       * (Leaves the context unchanged!)
       */
      const empty = () => {
        let i = 0;
        let hasCache = !!cache.get(`${POLL_CACHE_KEY}-${i}`);

        while (hasCache) {
          cache.remove(`${POLL_CACHE_KEY}-${i}`);

          i++;
          hasCache = !!cache.get(`${POLL_CACHE_KEY}-${i}`);
        }
      };

      /**
       * Emplties the data poll cache and clears the context
       */
      const clear = () => {
        context.updates = [];
        empty();

        if (logging)
          console.log('cache.clear()');
      };

      return {
        load,
        set,
        sessionInfo,
        clear
      };
    };

    const cache = caching();

    /**
     * Maps the cached objects to an array of all update info
     * @param {Object} updates data poll cache updates
     * @returns {AppsDataPollUpdate[]} list of update info
     */
    const mapUpdates = (updates) => Object.keys(updates).flatMap(model => {
      const modelUpdates = updates[model];
      return Object.keys(modelUpdates).map(key => {
        const { sess, rec, del, ts } = modelUpdates[key];
        return { sess, model, rec, del, ts };
      });
    });

    /**
     * Checks for new updates since the last successfull poll
     * @param {string} session - session id 
     * @param {number} lastSuccess - last successfull poll timestamp
     * @returns {AppsDataPollUpdate[]}
     */
    const newUpdates = (session, lastSuccess) => {
      cache.load();
      return mapUpdates(context.updates).filter(u => u.sess !== session && u.ts >= lastSuccess);
    };

    /**
     * Checks if the poll has updates
     * @param {string} session - session id 
     * @returns {Boolean}
     */
    const poll = (session) => {
      const info = cache.sessionInfo.get(session);

      if (logging)
        console.log('poll()');

      const ts = Date.now();
      const changes = newUpdates(session, info.lastSuccess);
      const lastSuccessTooLongAgo = cache.sessionInfo.stale();

      cache.sessionInfo.set(session, { ts });
      //Poll if too long since last success or if there are changes that arent users
      return lastSuccessTooLongAgo || changes.length > 0;
    };

    /**
     * Waits for a given period of time which checking for new updates, returns them immediately if found
     * @param {string} session - session id
     * @returns {AppsDataPollUpdate[]} list of updates
     */
    const longPoll = (session) => {
      const info = cache.sessionInfo.get(session);

      //WAIT, POLL, RESPOND
      const stopWaiting = Date.now() + (1000 * LONG_POLL_WAIT_SECONDS);

      let ts;
      while (Date.now() <= stopWaiting && !cache.sessionInfo.get(session).cancel) {
        ts = Date.now();
        const updates = newUpdates(session, info.lastSuccess);

        if (updates.length > 0) {
          cache.sessionInfo.set(session, { ts });
          return updates;
        }

        Utilities.sleep(1000 * 5);
      }

      cache.sessionInfo.set(session, { ts });
      return [];
    };

    /**
     * Cancels a given session poll
     * @param {string} session - session id
     */
    const cancel = (session) => cache.sessionInfo.set(session, { cancel: true });

    /**
     * Inspects (logs) the cached data and returns the cached data
     */
    const inspect = () => {
      const data = cache.load();
      console.log(JSON.stringify(data, 2))
      return data;
    };

    const api = {
      cache,
      poll,
      longPoll,
      cancel,
      inspect
    };

    return api;
  }

}