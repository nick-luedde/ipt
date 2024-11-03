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
class AppsDrivePicker {

  /**
   * Returns the content of a Drive folder (directory)
   * @param {Object} [options] - optional options 
   * @param {Object} [options.id] - optional id of directory 
   */
  static dir({ id } = {}) {
    const dfs = DriveFileSystem.dfs({ id });
    const { files, folders } = dfs.folder.tree({ path: '/' });
    return [...folders, ...files];
  }

  /**
   * Searches Drive for matching resource name
   * @param {string} term -search term
   */
  static search(term) {
    const dfs = DriveFileSystem.dfs();
    const files = dfs.file.find({ path: '/' }, `title contains "${term.replace(/'/g, "\'")}"`);
    const folders = dfs.folder.find({ path: '/' }, `title contains "${term.replace(/'/g, "\'")}"`);

    const fileInfo = files.map(f => dfs.file.inspect({ src: f }));
    const folderInfo = folders.map(f => dfs.folder.inspect({ src: f }));

    return [...folderInfo, ...fileInfo];
  }

  /**
   * Setup for AppsServer
   */
  static use(server) {

    server.post('/apps-drive-picker/dir', (req, res) => {
      const { id } = (req.body || {});
      const results = AppsDrivePicker.dir({ id });
      res.status(server.STATUS_CODE.SUCCESS).send(results);
    });

    server.post('/apps-drive-picker/search', (req, res) => {
      const { term } = (req.body || {});
      const results = AppsDrivePicker.search(term);
      res.status(server.STATUS_CODE.SUCCESS).send(results);
    });

  }

  /**
   * middleware for AppsServer
   */
  static middleware(req, res, next) {
    if (req.route === '/apps-drive-picker/dir') {
      const { id } = (req.body || {});
      const results = AppsDrivePicker.dir({ id });
      return res.status(server.STATUS_CODE.SUCCESS).send(results);
    } else if (req.route === '/apps-drive-picker/search') {
      const { term } = (req.body || {});
      const results = AppsDrivePicker.search(term);
      return res.status(server.STATUS_CODE.SUCCESS).send(results);
    }

    next();
  }

}
class ApiError extends Error {
  constructor(message, { code = 400 } = {}) {
    super(message);
    this.code = code;
  }
}

class AppsServer {

  /**
   * App server definition
   * Requests made successfully through a server object will always return a json response with a body prop
   *   - The body of the response will be either json type, or html type content
   * Requests that error will return a json response with an error prop
   *   - The error of the response will be an object with at minimum a message, but may also have a cause property
   * @param {*} options 
   * @returns {AppsServer}
   */
  static create(options = {}) {
    //TODO: default options
    const debug = options.debug || false;

    const STATUS_CODE = {
      SUCCESS: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      SERVER_ERROR: 500
    };

    const MIME_TYPES = {
      JSON: 'application/json',
      HTML: 'text/html',
      CSV: 'text/csv',
      JS: 'js/object',
      RAW: 'data/raw'
    };

    const parseRouteWithParams = (route) => {
      const params = {};
      const [routestr, paramstr] = route.split('?');

      if (!paramstr)
        return {
          route: routestr,
          params
        };

      const elements = paramstr.split('&');
      elements.forEach(el => {
        const [prop, val] = el.split('=');
        params[decodeURIComponent(prop)] = decodeURIComponent(val);
      });

      return {
        route: routestr,
        params
      };
    };

    /**
     * Attempts to find and tokenize a matching route with named parames (ie. /home/user/:id)
     * @param {AppsRequest} req - request obj
     * @param {Object} method - route methods
     */
    const findTokenRoute = (req, method) => {
      const tokenRoutes = Object.keys(method).filter(key => key.includes(':'));

      for (const route of tokenRoutes) {
        const tk = tokenizeRoute(route);
        if (tk.isMatch(req.route)) {
          req.params = {
            ...req.params,
            ...tk.paramsFromTokens(req.route)
          };
          return method[route];
        }
      }
    };

    /**
     * Tokenizes a registered route so that it can be used to match a requested route
     * @param {string} route - registered route to tokenize for matching
     */
    const tokenizeRoute = (route) => {
      const parts = route.split('/');
      // if theres a part that starts with ':' it means its a route param,
      // so that means we have to pick that part out of the actual route and get that as a param somehow...
      // So the regex could become => :param replace with [^/]* then matching...
      // and the param could remember where it came from (before and after uri, then match within...)

      const tokens = [];
      parts.forEach((p, i) => {
        if (p.startsWith(':')) {
          tokens.push([parts[i - 1] || '', p, [parts[i + 1] || '']]);
        }
      });

      // now we can match the route still...
      const matcher = route.replace(/:[^/]*/g, '[^/]*');
      const isMatch = (sent) => new RegExp(matcher).test(sent);

      // and when we get a route, we can match the values
      const paramsFromTokens = (sent) => {
        const params = {};
        tokens.forEach(t => {
          const key = t[1].replace(':', '');
          const before = t[0];
          const after = t[2];

          const [match] = (sent.match(`(?<=.*/${before !== undefined ? before : ''}/)([^/]*)(?=/?${after !== undefined ? after : ''}.*)`) || []);
          params[key] = decodeURIComponent(match);
        });

        return params;
      };

      return { isMatch, paramsFromTokens };

    };

    const matchRoute = (pattern, route) => new RegExp(pattern).test(route);

    const middleware = [];
    const use = (route, fn) => {
      const mw = (req, res, next) => {
        if (!matchRoute(route, req.route))
          return next();

        return fn(req, res, next);
      }
      middleware.push(mw);
    };

    const errors = [];
    const error = (fn) => errors.push(fn);

    const gets = {};
    const get = (route, ...fns) => {
      gets[route] = fns;
    };

    const posts = {};
    const post = (route, ...fns) => {
      posts[route] = fns;
    };

    const deletes = {};
    const del = (route, ...fns) => {
      deletes[route] = fns;
    };

    const methods = {
      get: gets,
      post: posts,
      delete: deletes
    };

    /**
     * Print routes
     */
    const inspect = () => {
      let details = 'AppsServer inspect:\n\n';

      details += 'GET ROUTES\n';
      details += '---------------------\n';
      details += Object.keys(gets).join('\n');
      details += '\n---------------------\n\n';

      details += 'POST ROUTES\n';
      details += '---------------------\n';
      details += Object.keys(posts).join('\n');
      details += '\n---------------------\n\n';

      details += 'DELETE ROUTES\n';
      details += '---------------------\n';
      details += Object.keys(deletes).join('\n');
      details += '\n---------------------\n\n';

      console.log(details);
      return details;
    };

    /**
     * Create new response obj
     */
    const response = () => {
      const res = {
        status: 999,
        headers: {},
        type: MIME_TYPES.JSON,
        body: null,
      };

      /**
       * Handler of response typing
       */
      res.toType = () => {
        if (res.type === MIME_TYPES.JSON)
          return JSON.stringify(res);

        if (res.type === MIME_TYPES.RAW)
          return res.body;

        return res;
      };

      const isSuccess = () => res.status >= 200 && res.status < 300;

      const send = (body) => {
        res.body = body;
        return res;
      };

      const render = ({ html, file }, props) => {
        const template = html
          ? HtmlService.createTemplate(html)
          : file
            ? HtmlService.createTemplateFromFile(file)
            : HtmlService.createTemplate('');

        template.props = props;
        const output = template.evaluate();

        res.status = STATUS_CODE.SUCCESS;
        res.type = MIME_TYPES.HTML;
        res.body = output;

        return res;
      };

      const type = (ty) => {
        res.type = ty;
        return api;
      };

      const status = (code) => {
        res.status = code;
        return api;
      };

      const headers = (hdrs) => {
        res.headers = {
          ...res.headers,
          ...hdrs
        };
        return api;
      };

      const api = {
        locals: {},
        isSuccess,
        send,
        render,
        status,
        headers,
        type,
        res
      };

      return api;
    };

    /**
     * Middleware stack composer
     * @param {AppsRequest} req - request
     * @param {AppsResponse} res - response
     * @param {Function[]} handlers - route handlers
     */
    const mwstack = (req, res, handlers) => {
      let index = 0;
      const all = [
        ...middleware,
        ...handlers
      ];

      const nxt = (i) => {
        index = i;

        let mw = all[index];
        if (!mw) {
          // If we have made it to the last element of the stack (which will be the route handler, it is undefined, return NOT_FOUND_RESPONSE)
          if (index === all.length)
            return res.status(STATUS_CODE.NOT_FOUND).send({ message: `${req.route} not a valid route!` })
          else
            throw new Error(`Something went wrong in the mw stack for index ${index}`);
        }

        return mw(req, res, nxt.bind(null, index + 1));
      };

      return nxt(0);
    }

    /**
     * Handles a request from the client
     * @param {AppsRequest} req - request options
     * @returns {AppsResponse} response 
     */
    const request = (req) => {

      try {
        req.by = Session.getActiveUser().getEmail();
        req.auth = {};

        req.params = req.params || {};
        req.rawRoute = req.route;

        const parsed = parseRouteWithParams(req.route);
        req.route = parsed.route;
        req.params = {
          ...req.params,
          ...parsed.params
        };

        const res = response();
        const method = methods[String(req.method).toLowerCase()] || {};

        let handler = method[req.route];
        if (!handler)
          handler = findTokenRoute(req, method) || [];

        debug && console.time('mwstack');
        mwstack(req, res, handler);
        debug && console.timeEnd('mwstack');

        return res.res;
      } catch (error) {
        const res = response();
        console.error(error);
        console.error(error.stack);

        res.status(error.code || STATUS_CODE.SERVER_ERROR)
          .send({
            name: error.name,
            message: error.code ? error.message : 'Something went wrong!',
            stack: debug ? error.stack : undefined
          });

        errors.forEach(handler => {
          try {
            handler(error, req);
          } catch (handlerError) {
            console.error(handlerError);
            console.error(handlerError.stack);
          }
        });

        if (debug) {
          console.log('error-request', req);
          console.log('error-response', res);
        }

        return res.res;
      }

    };

    /**
     * Helper to handle client requests, call this from the top level "api" function in your app
     * @param {AppsRequest} req - request
     */
    const handleClientRequest = (req = {}) => {
      if (typeof req === 'string')
        req = JSON.parse(req);
      //ignore any additional props of the request so we know the request is clean when it comes in
      const {
        method,
        headers,
        route,
        params,
        body
      } = req;

      return request({
        method,
        headers,
        route,
        params,
        body
      }).toType();
    };

    /**
     * Helper to handle doGet request (just call this with your server obj in your doGet fn)
     * @param {Object} event - Google Apps Script Request object
     */
    const handleDoGet = (event = {}, { homeroute = '/' } = {}) => {
      const pathInfo = event.pathInfo === undefined ? '' : event.pathInfo
      const path = String(pathInfo).toLowerCase();

      if (path.startsWith('api/')) {
        const response = handleClientRequest({
          method: 'get',
          route: path.slice(3),
          params: event.parameter
        });

        return ContentService
          .createTextOutput(response)
          .setMimeType(ContentService.MimeType.JSON);
      }

      const content = request({
        method: 'get',
        route: path !== '' ? `/${path}` : homeroute,
        params: event.parameter
      });

      return content.body;
    };

    /**
     * Helper to handle doPost request (just call this with your server obj in your doPost fn)
     * @param {Object} event - Google Apps Script Request object
     */
    const handleDoPost = (event = {}) => {
      const pathInfo = event.pathInfo === undefined ? '' : event.pathInfo
      const fullPath = String(pathInfo).toLowerCase();
      const path = fullPath.startsWith('api/')
        ? fullPath.slice(3)
        : `/${fullPath}`;

      const {
        method,
        type = 'application/json'
      } = event.parameter;

      const body = type === 'application/json'
        ? JSON.parse(event.postData.contents)
        : event.postData.contents;

      const response = handleClientRequest({
        method: method || 'post',
        route: path,
        type,
        body,
        params: event.parameter
      });

      return ContentService
        .createTextOutput(response)
        .setMimeType(ContentService.MimeType.JSON);
    };

    return {
      STATUS_CODE,
      MIME_TYPES,
      inspect,
      use,
      error,
      get,
      post,
      delete: del,
      request,
      handleClientRequest,
      handleDoGet,
      handleDoPost
    };
  }

}
/**
 * @typedef {Object} AppsSystemLog
 * @property {string} id - log id
 * @property {string} timestamp - log timestamp
 * @property {string} sysid - project id
 * @property {string} system - readable system name
 * @property {string} user - readable user email
 * @property {string} level - readable user name/email
 * @property {string} message - log message
 * @property {Object} json - log json
 * @property {string} notify - comma separated notify emails
 */

class AppsSystemLogger {

  static get LEVEL() {
    return {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      VERBOSE: 3
    };
  }

  static getLevelName(n) {
    const lvl = {
      0: 'ERROR',
      1: 'WARN',
      2: 'INFO',
      3: 'VERBOSE'
    };

    return lvl[n] || 'UNKNOWN';
  }

  static get TYPE() {
    return {
      CONSOLE: 'CONSOLE',
      DATA_SYSTEM: 'DATA_SYSTEM',
      BATCH: 'BATCH',
      FILE: 'FILE',
      MESSAGE: 'MESSAGE',
    };
  }

  static timestamp() {
    return (new Date()).toJSON();
  }

  /**
   * Creates logger object
   * @param {Object} options - logger options
   */
  static create({
    sysid,
    system,
    env,
    activeLevel = 2,
    types = [],
    defaultEmail,
    apiId,
    apiKey,
    folderId,
    batchIntervalSeconds = 60 * 60 * 6
  }) {
    let activeLogs = [...types];
    const email = defaultEmail;

    let throwError = true;
    const quiet = () => throwError = false;
    const loud = () => throwError = true;

    let sys_;
    const sys = () => {
      if (!sys_)
        sys_ = AppSheetAPI.create(apiId, apiKey);

      return sys_;
    };

    const exec = (fn) => {
      if (throwError) {
        fn();
      } else {
        try {
          fn();
        } catch (err) {
          console.error(`SYSTEM LOG FAILURE: ${err.message}\n${err.stack}`)
        }
      }
    };

    /**
     * Gets a log with all system values provided
     * @param {AppsSystemLog} log - log to map
     * @param {Object} options 
     * @returns {AppsSystemLog}
     */
    const asLog = (log, { convert = true } = {}) => ({
      id: Utilities.getUuid(),
      level: AppsSystemLogger.getLevelName(log.level),
      user: Session.getActiveUser().getEmail(),
      timestamp: AppsSystemLogger.timestamp(),
      sysid,
      system,
      message: log.message,
      json: typeof log.json === 'object' && convert ? JSON.stringify(log.json, null, 2) : log.json,
      notify: log.notify || undefined
    });

    /**
     * Returns log string
     * @param {AppsSystemLog} lg 
     */
    const toString = (lg) =>
      `SYSTEM [${AppsSystemLogger.getLevelName(lg.level)}] LOG (${lg.user}) ${AppsSystemLogger.timestamp()} - ${lg.message}${!!lg.json ? `\n\t${lg.json}` : ''}`;

    /**
     * Logs to default console
     * @param {AppsSystemLog} log
     */
    const logToConsole = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.CONSOLE) || log.level > activeLevel)
        return;

      exec(() => console.log(toString(asLog(log))));
    };

    /**
     * Logs to json file
     * @param {AppsSystemLog} log
     */
    const logToFile = (log, fname) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.FILE) || log.level > activeLevel)
        return;

      if (!folderId)
        throw new Error('Missing folder id, cannot log to file!');

      exec(() => {
        const folder = DriveApp.getFolderById(folderId);
        folder.createFile(
          fname || `SYSTEM-[${AppsSystemLogger.getLevelName(log.level)}]-LOG_${AppsSystemLogger.timestamp()}.json`,
          JSON.stringify(asLog(log, { convert: false }), null, 2)
        );
      });
    };

    /**
     * Logs to AppsSystemLogger data system
     * @param {AppsSystemLog} log
     */
    const logToDataSystem = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.DATA_SYSTEM) || log.level > activeLevel)
        return;

      exec(() => sys().body({ action: 'Add', rows: [asLog(log)] }).postSync('/SystemLog/Action'));
    };

    /**
     * Logs to default console
     * @param {AppsSystemLog} log
     */
    const logToMessage = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.MESSAGE) || log.level > activeLevel)
        return;

      exec(() => logToDataSystem({ ...log, notify: log.notify || email }));
    };

    const batchCache = {
      KEY: `__${env || 'dev'}_system_logger_batch_`,
      _c: null,
      instance() {
        if (!batchCache._c)
          batchCache._c = CacheService.getScriptCache();
        return batchCache._c;
      },
      /**
       * Gets the list of cached logs
       * @returns {AppsSystemLog[]}
       */
      get() {
        return JSON.parse(batchCache.instance().get(batchCache.KEY) || '[]');
      },
      /**
       * Puts a log in the batch cache
       * @param {AppsSystemLog} log
       */
      put(log) {
        const all = batchCache.get();
        batchCache.instance().put(batchCache.KEY, JSON.stringify([...all, asLog(log)]), batchIntervalSeconds);
      },
      /**
       * Clears the batch cache
       */
      clear() {
        batchCache.instance().remove(batchCache.KEY);
      }
    };

    const batch = {
      /**
       * Logs to default console
       * @param {AppsSystemLog} log
       */
      data(log) {
        if (!activeLogs.includes(AppsSystemLogger.TYPE.BATCH) || log.level > activeLevel)
          return;

        exec(() => {
          const lock = LockService.getScriptLock();

          lock.waitLock(1000 * 20);
          batchCache.put(log);
          lock.releaseLock();
        });

      },

      sweep() {
        const messages = batchCache.get();
        if (messages.length > 0)
          sys().body({ action: 'Add', rows: messages }).postSync('/SystemLog/Action');

        batchCache.clear();
      }
    };

    const level = (lvl) => {
      activeLevel = lvl;
      return api;
    };

    const attach = (type) => {
      const set = new Set([...activeLogs, type]);
      activeLogs = [...set];
      return api;
    };

    const detach = (type) => {
      activeLogs = activeLogs.filter(t => t !== type);
      return api;
    };

    const error = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
    };
    const warn = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
    };
    const info = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
    };
    const verbose = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
    };

    const api = {
      quiet,
      loud,
      console: logToConsole,
      data: logToDataSystem,
      batch,
      file: logToFile,
      message: logToMessage,
      level,
      attach,
      detach,
      error,
      warn,
      info,
      verbose,
    };

    return api;
  }

}
class DriveFileSystem {

  /** @typedef {'bytes' | 'base64' | 'string' | 'json' | 'csv'} DfsAsOption */

  /**
   * Drive File System (dfs) functional resources
   * @param {object} resource - resource identifier 
   * @param {string} [resource.id] - resource id 
   * @param {string} [resource.path] - resource directory path 
   * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
   */
  static dfs({ id, path, dir } = {}) {
    const helpers = {

      /**
       * Parses a Drive url to a file id
       * @param {string} url - url to parse
       */
      parseUrlToId(url) {
        const regex = /((?<=\/folders\/)[^\/\?]*)|((?<=\/d\/)[^\/\?]*)/;
        const match = regex.exec(url || '');
        const [id] = (match || []);
        return id;
      },

      /**
       * Gets file metadata
       * @param {GoogleAppsScript.Drive.File} file - file to get metadata for
       */
      getFileMeta(file) {
        const id = file.getId();
        const type = file.getMimeType();
        if (type === 'application/vnd.google-apps.folder')
          throw new Error(`Resource with id ${id} is not a file! Cannot get file metadata.`);

        return {
          resource: 'file',
          id,
          url: file.getUrl(),
          download: file.getDownloadUrl(),
          name: file.getName(),
          size: file.getSize(),
          type,
          owner: file.getOwner().getEmail(),
          created: file.getDateCreated().toJSON(),
          updated: file.getLastUpdated().toJSON(),
          viewers: file.getViewers().map(u => u.getEmail()),
          editors: file.getEditors().map(u => u.getEmail()),
          trashed: file.isTrashed(),
          target: file.getTargetId(),
          targetType: file.getTargetMimeType(),
          file: () => file
        };
      },

      /**
       * Attempts to resolve a set of given { id, path } arguments to a file resource
       * @param {object} arg 
       * @param {string} [arg.id] - id of resource 
       * @param {string} [arg.path] - path to resource
       * @param {GoogleAppsScript.Drive.File} [arg.src] - resource src obj
       * @param {object} options 
       * @param {boolean} [options.create] - create any necessary directory structure if not exists 
       * @param {boolean} [options.throwErr] - throw an error if given resource not located 
       */
      resolveFileIdPathArgs(arg, { create = true, throwErr = true } = {}) {
        if (arg.src)
          return arg.src;

        if (arg.id) {
          const file = helpers.quietGetFileById(arg.id);
          if (!file && throwErr)
            throw new Error(`No file found at ${arg.id}`);
          return file;
        }

        if (arg.path) {
          const file = helpers.resolvePathToFile(arg.path, { create });
          if (!file && throwErr)
            throw new Error(`No file found at ${arg.path}`);
          return file;
        }
      },

      /**
       * Attempts to retrieve a file by id, returns null if cannot retrieve
       * @param {string} id - id of file
       */
      quietGetFileById(id) {
        try {
          return DriveApp.getFileById(id);
        } catch (error) {
          //TODO eat access error, throw others...
          console.error(error);
          return null;
        }
      },

      /**
       * helper to resolve a given path, and return the result
       * @param {GoogleAppsScript.Drive.Folder} [root] - root to work form
       * @param {string} name - name of file
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      quietGetFileByName(root, name, { create }) {
        const folder = root || wd;
        const fileIter = folder.getFilesByName(name);

        try {
          return fileIter.next();
        } catch (error) {
          if (create)
            return folder.createFile(name);

          console.error(error);
          return null;
        }
      },

      /**
       * helper to resolve a given path, and return the result
       * @param {string} path - path to resolve
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      resolvePathToFile(path, { create }) {
        const parts = path.split('/');

        const fileName = parts.pop();
        const resolvedFolder = helpers.resolvePathToFolder(parts.join('/'), { create });

        if (!resolvedFolder)
          return null;

        return helpers.quietGetFileByName(resolvedFolder, fileName, { create });
      },

      /**
       * Gets folder metadata
       * @param {GoogleAppsScript.Drive.Folder} folder - folder to get metadata for
       */
      getFolderMeta(folder) {
        return {
          resource: 'folder',
          id: folder.getId(),
          url: folder.getUrl(),
          name: folder.getName(),
          size: folder.getSize(),
          owner: folder.getOwner().getEmail(),
          created: folder.getDateCreated().toJSON(),
          updated: folder.getLastUpdated().toJSON(),
          viewers: folder.getViewers().map(u => u.getEmail()),
          editors: folder.getEditors().map(u => u.getEmail()),
          trashed: folder.isTrashed(),
          folder: () => folder
        };
      },

      /**
       * Attempts to resolve a set of given { id, path } arguments to a folder resource
       * @param {object} arg 
       * @param {string} [arg.id] - id of resource 
       * @param {string} [arg.path] - path to resource
       * @param {GoogleAppsScript.Drive.Folder} [arg.src] - resource src obj
       * @param {object} options 
       * @param {boolean} [options.create] - create any necessary directory structure if not exists 
       * @param {boolean} [options.throwErr] - throw an error if given resource not located 
       */
      resolveFolderIdPathArgs(arg = { id, path = '.', src } = {}, { create = true, throwErr = true } = {}) {
        if (arg.src)
          return arg.src;

        if (arg.id) {
          const folder = helpers.quietGetFolderById(arg.id);
          if (!folder && throwErr)
            throw new Error(`No folder at ${arg.id}`);
          return folder;
        }

        if (arg.path) {
          const folder = helpers.resolvePathToFolder(arg.path, { create });
          if (!folder && throwErr)
            throw new Error(`No folder at ${arg.path}`);

          return folder;
        }
      },

      /**
       * Attempts to retrieve a folder by id, returns null if cannot retrieve
       * @param {string} id - id of folder
       */
      quietGetFolderById(id) {
        try {
          return DriveApp.getFolderById(id);
        } catch (error) {
          //TODO eat access error, throw others...
          console.error(error);
          return null;
        }

      },

      /**
       * helper to resolve a given path, and return the result
       * @param {GoogleAppsScript.Drive.Folder} [root] - root to work form
       * @param {string} name - name of folder
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      quietGetFolderByName(root, name, { create }) {
        const folderIter = root.getFoldersByName(name);

        try {
          return folderIter.next();
        } catch (error) {
          if (create)
            return root.createFolder(name);

          console.error(error);
          return null;
        }
      },

      /**
       * private helper to resolve a given path, and return the result
       * @param {string} path - path to resolve
       */
      resolvePathToFolder(path, { create }) {
        if (!path || path === '.')
          return wd;

        const parts = path.split('/').filter(p => !!p);
        const relative = path.startsWith('/');

        const root = relative ? wd : DriveApp.getRootFolder();

        return helpers.resolvePathParts(parts, root, { create });
      },

      /**
       * Resolves an array of parts to a folder
       * @param {string[]} parts - parts string array
       * @param {GoogleAppsScript.Drive.Folder} root - starting folder
       */
      resolvePathParts(parts, root, { create }) {
        let resolution = root;
        parts.forEach(part => {
          if (resolution)
            resolution = helpers.quietGetFolderByName(resolution, part, { create });
        });

        return resolution;
      }
    };

    /**
     * resolves set of args to a Drive.Folder
     * @param {object} [resource] - resource identifier 
     * @param {string} [resource.id] - resource id 
     * @param {string} [resource.path] - resource directory path 
     * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
     * @param {GoogleAppsScript.Drive.Folder} [root] - optional root for case where resource.path is relative 
     */
    const resolveArgsToWd = ({ id, path, dir } = {}) => {
      if (dir)
        return dir;

      else if (id) {
        const folder = helpers.quietGetFolderById(id);
        if (!folder)
          throw new Error(`Folder with id ${id} was not found or is inaccessible!`);

        return folder;
      } else if (path) {
        const folder = helpers.resolvePathParts(path.split('/').filter(p => !!p), DriveApp.getRootFolder(), { create: false });
        if (!folder)
          throw new Error(`${path} not found`);

        return folder;
      }

      return DriveApp.getRootFolder();
    };

    const wd = resolveArgsToWd({ id, path, dir });

    /**
     * Returns current dfs or new if resources provided
     * @param {object} resource - resource identifier 
     * @param {string} [resource.id] - resource id 
     * @param {string} [resource.path] - resource directory path 
     * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
     */
    const cwd = ({ id, path, dir } = {}) => {
      if (!id && !path && !dir)
        return api;

      return DriveFileSystem.dfs({ id, path, dir });
    };

    const currentPath = () => {
      let parentIter = wd.getParents();
      const route = [wd.getName()];

      while (parentIter && parentIter.hasNext()) {
        const parent = parentIter.next();
        route.push(parent.getName());
        parentIter = parent.getParents();
      };

      return route.reverse().join('/');
    };

    const sharing = ({ id, res }, type) => {
      const resourceId = id || res.getId();
      let notify = false;
      let permissions;

      const roles = {
        read: 'reader',
        comment: 'reader',
        write: 'writer'
      };

      let resource = res;
      const getResource = () => {
        if (resource)
          return resource;

        return type === 'file'
          ? DriveApp.getFileById(id)
          : DriveApp.getFolderById(id);
      };

      const quiet = (val = true) => {
        notify = !val;
        return ret;
      };

      const details = (force) => {
        if (!permissions || force)
          permissions = Drive.Permissions.list(resourceId).items;

        return permissions;
      };

      const patchPermissionDetails = (perm) => {
        if (!permissions)
          return;

        const index = permissions.findIndex(d => d.id === perm.id);
        if (index !== -1)
          permissions.splice(index, 1, perm);
        else
          permissions.push(perm);
      };

      const revoke = (email) => {
        try {
          getResource().revokePermissions(email);
          if (permissions)
            permissions = permissions.filter(d => d.emailAddress !== email);
        } catch (err) { }

        return ret;
      };

      const actions = (role) => {
        const additionalRoles = role === 'comment'
          ? ['commenter']
          : undefined;

        const add = (email) => {
          const res = Drive.Permissions.insert({
            type: 'user',
            role: roles[role],
            value: email,
            additionalRoles
          }, resourceId, { sendNotificationEmails: notify });

          patchPermissionDetails(res);
          return ret;
        };

        const update = (email) => {
          const dets = details();
          const permission = dets.find(d => d.emailAddress === email);

          //TODO: if none, should we add or fail?
          if (!permission)
            return add(email);

          const res = Drive.Permissions.update({
            role: roles[role]
          },
            resourceId,
            permission.id
          );

          patchPermissionDetails(res);
          return ret;
        };

        return {
          add,
          update
        };
      };

      const read = actions('read');
      const comment = actions('comment');
      const write = actions('write');

      const unshare = () => {
        const res = getResource();

        const { editors, viewers } = type === 'file'
          ? helpers.getFileMeta(res)
          : helpers.getFolderMeta(res);

        editors.forEach(revoke);
        viewers.forEach(revoke);

        if (permissions)
          permissions = permissions.filter(d => d.role !== 'owner');

        return ret;
      };

      const readonly = () => {
        const permissions = details().filter(p => p.role !== 'owner');
        permissions.forEach(per => {
          const res = Drive.Permissions.update({
            role: roles.read
          },
            resourceId,
            per.id
          );
          patchPermissionDetails(res);
        });
        return ret;
      };

      const ret = {
        quiet,
        details,
        private: unshare,
        readonly,
        revoke,
        read,
        comment,
        write
      };

      return ret;
    };

    const file = () => {

      const VALID_AS_TYPES = [
        'bytes',
        'base64',
        'string',
        'json',
        'csv'
      ];

      /**
       * Throws an error if invalid 'as' type
       * @param {DfsAsOption} as - string type to validate
       */
      const validateAs = (as) => {
        const valid = VALID_AS_TYPES.includes(as);
        if (!valid)
          throw new Error(`Invalid file 'as' type ${as}. Must be one of: (${VALID_AS_TYPES.join(', ')})`);
      };

      return {
        /**
         * Copies a file to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         * @param {string} [name] - optional new file name
         */
        copy(from, to, name) {
          const fromFile = helpers.resolveFileIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFile.makeCopy(name || fromFile.getName(), toDestination);
        },

        /**
         * Checks if file exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        exists({ id, path, src }) {
          const existing = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          return !!existing;
        },

        /**
         * Creates a new file at the given resource location
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {object} options - file create options
         * @param {string} [options.name] - optional file name
         * @param {string} [options.string] - optional file content string
         * @param {GoogleAppsScript.Base.Blob} [options.blob] - optional content blob
         * @param {string | Array<any[]>} [options.csv] - optional content csv
         * @param {string} [options.json] - optional content json
         * @param {GoogleAppsScript.Byte[]} [options.bytes] - optional content bytes
         */
        create({ id, path, src }, { name, string, blob, csv, json, bytes }) {
          const destinationFolder = helpers.resolveFolderIdPathArgs({ id, path, src });

          if (string)
            return destinationFolder.createFile(name, string);
          if (blob)
            return destinationFolder.createFile(blob);
          if (csv) {
            const content = Array.isArray(csv)
              ? csv.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
              : String(csv);
            return destinationFolder.createFile(name, content);
          }
          if (json) {
            const content = typeof json === 'object'
              ? JSON.stringify(json)
              : String(json);
            return destinationFolder.createFile(name, content);
          }
          if (bytes) {
            const byteBlob = Utilities.newBlob('', null, name);
            byteBlob.setBytes(bytes);
            return destinationFolder.createFile(byteBlob);
          }

          return destinationFolder.createFile(name);
        },

        /**
         * Searches for files in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {string} [resource.url] - resource url
         */
        get({ id, path, src, url }) {
          if (url)
            id = helpers.parseUrlToId(url);
          return helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
        },

        /**
         * Searches for files in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {string} search - search object, see: https://developers.google.com/drive/api/guides/ref-search-terms
         */
        find({ id, path, src }, search) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src });

          const fileIter = folder.searchFiles(search);
          const files = [];
          while (fileIter.hasNext()) {
            files.push(fileIter.next());
          };

          return files;
        },

        /**
         * Returns a give file resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        inspect({ id, path, src }) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false });
          if (!file)
            return null;

          return helpers.getFileMeta(file);
        },

        /**
         * Moves a file to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         */
        move(from, to) {
          const fromFile = helpers.resolveFileIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFile.moveTo(toDestination);
        },

        /**
         * reads a given file resources content
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {object} [options] - otpions
         * @param {DfsAsOption} [options.as] - type to read file content as 
         */
        read({ id, path, src }, { as = 'string' } = {}) {
          validateAs(as);
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false });

          if (as === 'bytes')
            return file.getBlob().getBytes();
          if (as === 'base64') {
            const bytes = file.getBlob().getBytes();
            return Utilities.base64Encode(bytes);
          }
          if (as === 'string')
            return file.getBlob().getDataAsString();
          if (as === 'json')
            return JSON.parse(file.getBlob().getDataAsString() || null);
          if (as === 'csv') {
            const content = file.getBlob().getDataAsString();
            return Utilities.parseCsv(content);
          }
        },

        /**
         * Trashes a give file resources
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {object} [options] - remove options
         * @param {boolean} [options.hard] - optional hard delete that skips the trash 
         */
        remove({ id, path, src }, { hard = false } = {}) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          if (file) {
            if (!hard)
              file.setTrashed(true)
            else
              Drive.Files.remove(file.getId());
          }

          return file;
        },

        /**
         * Gets list of parent folders
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        parents({ id, path, src }) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          const parents = [];
          if (file) {
            const iter = file.getParents();
            while (iter.hasNext())
              parents.push(helpers.getFileMeta(iter.next()));
          }
          return parents;
        },

        /**
         * writes to a given file resources
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {any} content - content to write
         * @param {object} [options] - otpions
         * @param {DfsAsOption} [options.as] - type to read write content as 
         */
        write({ id, path, src }, content, { as = 'string' } = {}) {
          validateAs(as);
          const file = helpers.resolveFileIdPathArgs({ id, path, src });

          if (as === 'bytes')
            file.setBytes(content);
          if (as === 'base64') {
            const bytes = Utilities.base64Decode(content);
            file.setBytes(bytes);
          }
          else if (as === 'string')
            file.setContent(content);
          else if (as === 'json')
            file.setContent(typeof content === 'string' ? content : JSON.stringify(content));
          else if (as === 'csv') {
            const csv = content.map(c => `"${String(c).replace(/"/g, '""')}"`).join('\n');
            file.setContent(csv);
          }

          return file;
        },

        /**
         * sharing options
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        share({ id, path, src }) {
          const res = path
            ? helpers.resolvePathToFile(path, { create: false })
            : undefined;

          return sharing({ id, res: src || res }, 'file');
        }

      };
    };

    const folder = () => {
      return {

        /**
         * creates a new directory as needed
         * @param {string} path - resource directory path 
         */
        dir(path) {
          const folder = helpers.resolveFolderIdPathArgs({ path });
          return cwd({ dir: folder });
        },

        /**
         * Checks if folder exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        exists({ id, path, src }) {
          const existing = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          return !!existing;
        },

        /**
         * Gets if folder exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {string} [resource.url] - resource url
         */
        get({ id, path, src, url }) {
          if (url)
            id = helpers.parseUrlToId(url);
          return helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
        },

        /**
         * Searches for folders in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {string} search - search object, see: https://developers.google.com/drive/api/guides/ref-search-terms
         */
        find({ id, path, src }, search) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });
          if (!folder)
            return [];

          const folderIter = folder.searchFolders(search);
          const folders = [];
          while (folderIter.hasNext()) {
            folders.push(folderIter.next());
          };

          return folders;
        },

        /**
         * Returns an array of the files in a given folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        files({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return [];

          const fileIter = folder.getFiles();
          const files = [];
          while (fileIter.hasNext()) {
            const file = fileIter.next();
            files.push(helpers.getFileMeta(file));
          };

          return files;
        },

        /**
         * Returns a give folders resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        inspect({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return null;

          return helpers.getFolderMeta(folder);
        },

        /**
         * Returns a given folders resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        tree({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return { files: [], folders: [] };

          const fileIter = folder.getFiles();
          const files = [];
          while (fileIter.hasNext()) {
            const file = fileIter.next();
            files.push(helpers.getFileMeta(file));
          };

          const folderIter = folder.getFolders();
          const folders = [];
          while (folderIter.hasNext()) {
            const fld = folderIter.next();
            folders.push(helpers.getFolderMeta(fld));
          }

          return { files, folders };
        },

        /**
         * Returns all subdirectory and subfile metadata for a given folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        walk({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return { files: [], folders: [] };

          const getFolderInfo = (folder) => {
            const folderIter = folder.getFolders();
            let files = [];
            let folders = [];

            while (folderIter.hasNext()) {
              const sub = folderIter.next();
              folders.push(helpers.getFolderMeta(sub));

              const results = getFolderInfo(sub);
              files = [...files, ...results.files];
              folders = [...folders, ...results.folders];
            }

            const fileIter = folder.getFiles();
            while (fileIter.hasNext()) {
              const file = fileIter.next();
              files.push(helpers.getFileMeta(file));
            };

            return { folders, files };
          };

          return getFolderInfo(folder);
        },

        /**
         * Moves a folder to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         */
        move(from, to) {
          const fromFolder = helpers.resolveFolderIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFolder.moveTo(toDestination);
        },
        /**
         * removes folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {object} [options] - remove options
         * @param {boolean} [options.hard] - optional hard delete that skips the trash 
         */
        remove({ id, path, src }, { hard = false } = {}) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });

          if (folder) {
            if (!hard)
              folder.setTrashed(true)
            else
              Drive.Files.remove(folder.getId());
          }

          return folder;
        },

        /**
         * Gets list of parent folders
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        parents({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          const parents = [];
          if (folder) {
            const iter = folder.getParents();
            while (iter.hasNext())
              parents.push(helpers.getFolderMeta(iter.next()));
          }
          return parents;
        },

        /**
         * sharing options
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        share({ id, path, src }) {
          const res = path
            ? helpers.resolvePathToFolder(path, { create: false })
            : undefined;

          return sharing({ id, res: src || res }, 'folder');
        }
      };
    };

    const api = {
      cwd,
      path: currentPath,
      file: file(),
      folder: folder()
    };

    return api;
  }

}


/**
 * @typedef {object} AdtTimeOptions
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds] 
 */

/**
 * @typedef {object} AdtCreateOptions
 * @prop {number} [year]
 * @prop {number} [month]
 * @prop {number} [day]
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds] 
 * @prop {boolean} [utc]
 */

/**
 * @typedef {object} AdtModifyOptions
 * @prop {number} [years] 
 * @prop {number} [months] 
 * @prop {number} [days]
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds]  
 * @prop {boolean} [utc]
 */

class AppsDateTime {

  static adt() {
    /**
     * Applies options to the date
     * @param {Date} date - date
     * @param {AdtCreateOptions} [options]
     */
    const apply = (date, options = {}) => {
      if (options.utc) {
        if (options.year !== undefined) date.setUTCFullYear(options.year);
        if (options.month !== undefined) date.setUTCMonth(options.month - 1);
        if (options.day !== undefined) date.setUTCDate(options.day);
        if (options.hours !== undefined) date.setUTCHours(options.hours);
        if (options.minutes !== undefined) date.setUTCMinutes(options.minutes);
        if (options.seconds !== undefined) date.setUTCSeconds(options.seconds);
        if (options.milliseconds !== undefined) date.setUTCMilliseconds(options.milliseconds);
      } else {
        if (options.year !== undefined) date.setFullYear(options.year);
        if (options.month !== undefined) date.setMonth(options.month - 1);
        if (options.day !== undefined) date.setDate(options.day);
        if (options.hours !== undefined) date.setHours(options.hours);
        if (options.minutes !== undefined) date.setMinutes(options.minutes);
        if (options.seconds !== undefined) date.setSeconds(options.seconds);
        if (options.milliseconds !== undefined) date.setMilliseconds(options.milliseconds);
      }

      return date;
    };

    /**
     * Applies arithmetic to date
     * @param {Date} date - date
     * @param {-1 | 1} sign - -1 | 1
     * @param {AdtModifyOptions} [options]
     */
    const arithmetic = (date, sign, options = {}) => {

      if (options.utc) {
        if (options.years !== undefined) date.setUTCFullYear(date.getUTCFullYear() + (sign * options.years));
        if (options.months !== undefined) date.setUTCMonth(date.getUTCMonth() + (sign * options.months));
        if (options.days !== undefined) date.setUTCDate(date.getUTCDate() + (sign * options.days));
        if (options.hours !== undefined) date.setUTCHours(date.getUTCHours() + (sign * options.hours));
        if (options.minutes !== undefined) date.setUTCMinutes(date.getUTCMinutes() + (sign * options.minutes));
        if (options.seconds !== undefined) date.setUTCSeconds(date.getUTCSeconds() + (sign * options.seconds));
        if (options.milliseconds !== undefined) date.setUTCMilliseconds(date.getUTCMilliseconds() + (sign * options.milliseconds));
      } else {
        if (options.years !== undefined) date.setFullYear(date.getFullYear() + (sign * options.years));
        if (options.months !== undefined) date.setMonth(date.getMonth() + (sign * options.months));
        if (options.days !== undefined) date.setDate(date.getDate() + (sign * options.days));
        if (options.hours !== undefined) date.setHours(date.getHours() + (sign * options.hours));
        if (options.minutes !== undefined) date.setMinutes(date.getMinutes() + (sign * options.minutes));
        if (options.seconds !== undefined) date.setSeconds(date.getSeconds() + (sign * options.seconds));
        if (options.milliseconds !== undefined) date.setMilliseconds(date.getMilliseconds() + (sign * options.milliseconds));
      }

      return date;
    };

    /** @param {AdtCreateOptions} [options] */
    const build = ({ year, month, day, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date();
      apply(date, { year, month, day, hours, minutes, seconds, milliseconds });
      return date;
    };

    /** @param {string} dtstr */
    const fromString = (dtstr) => {
      const datePattern = /^\d+-\d{2}-\d{2}$/;
      const datetimePattern = /^\d+-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}(\.\d{3}Z?)?$/;

      const isUTC = dtstr.endsWith('Z');

      const isDate = datePattern.test(dtstr);
      const isDateTime = datetimePattern.test(dtstr);
      if (!isDate && !isDateTime)
        return null;

      const dt = new Date(1970, 0, 1);
      if (isDate) {
        const [year, month, day] = dtstr.split('-').map((part) => parseInt(part, 10));
        apply(dt, { year, month, day, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
      }

      if (isDateTime) {
        const delimByT = dtstr.includes('T');
        const [date, timepart] = dtstr.split(delimByT ? 'T' : ' ');
        const [year, month, day] = date.split('-').map((part) => parseInt(part, 10));
        const [time, ms] = timepart.split('.');
        const [hours, minutes, seconds] = time.split(':').map((part) => parseInt(part, 10));
        apply(dt, { year, month, day, hours, minutes, seconds, milliseconds: parseInt(ms, 10), utc: isUTC });
      }

      if (Number.isNaN(dt.getTime()))
        return null;

      return dt;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtCreateOptions} [options]
     */
    const update = (dt, { year, month, day, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      apply(date, { year, month, day, hours, minutes, seconds, milliseconds });
      return date;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtModifyOptions} [options]
     */
    const add = (dt, { years, months, days, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      arithmetic(date, 1, { years, months, days, hours, minutes, seconds, milliseconds });
      return date;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtModifyOptions} [options]
     */
    const subtract = (dt, { years, months, days, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      arithmetic(date, -1, { years, months, days, hours, minutes, seconds, milliseconds });
      return date;
    };

    /** @param {Date[]} dts */
    const min = (dts) => {
      if (dts.length === 0)
        return null;

      const ms = Math.min(...dts.map(dt => dt.getTime()));
      return new Date(ms);
    };

    /** @param {Date[]} dts */
    const max = (dts) => {
      if (dts.length === 0)
        return null;

      const ms = Math.max(...dts.map(dt => dt.getTime()));
      return new Date(ms);
    };

    /**
     * @param {Date} larger - Larger date
     * @param {Date} smaller - Smaller date
     * @param {AdtTimeOptions} [options]
     */
    const prettyDiff = (larger, smaller, { hours, minutes, seconds, milliseconds } = {}) => {
      const yearDiff = larger.getFullYear() - smaller.getFullYear();
      const monthDiff = larger.getMonth() - smaller.getMonth();
      const dayDiff = larger.getDate() - smaller.getDate();
      const hoursDiff = larger.getHours() - smaller.getHours();
      const minutesDiff = larger.getMinutes() - smaller.getMinutes();
      const secondsDiff = larger.getSeconds() - smaller.getSeconds();
      const millisecondsDiff = larger.getMilliseconds() - smaller.getMilliseconds();

      const allMonths = (yearDiff * 12) + monthDiff - (dayDiff < 0);
      const totalYears = Math.floor(allMonths / 12);
      const totalMonths = allMonths % 12;

      const adjustedDays = dayDiff - (hoursDiff < 0);
      const totalDays = adjustedDays >= 0 ? adjustedDays : new Date(larger.getFullYear(), larger.getMonth() + 1, 0).getDate() + adjustedDays;

      const adjustedHours = hoursDiff - (minutesDiff < 0);
      const totalHours = adjustedHours >= 0 ? adjustedHours : 24 + adjustedHours;

      const adjustedMinutes = minutesDiff - (secondsDiff < 0);
      const totalMinutes = adjustedMinutes >= 0 ? adjustedMinutes : 60 + adjustedMinutes;

      const adjustedSeconds = secondsDiff - (millisecondsDiff < 0);
      const totalSeconds = adjustedSeconds >= 0 ? adjustedSeconds : 60 + adjustedSeconds;

      const totalMilliseconds = ((millisecondsDiff < 0) * 1000) + millisecondsDiff;

      const showMilliseconds = !!milliseconds;
      const showSeconds = !!seconds || showMilliseconds;
      const showMinutes = !!minutes || showSeconds;
      const showHours = !!hours || showMinutes;

      const parts = [];
      if (totalYears > 0)
        parts.push(`${totalYears} year${totalYears > 1 ? 's' : ''}`);

      if (totalMonths > 0)
        parts.push(`${totalMonths} month${totalMonths > 1 ? 's' : ''}`);

      if (totalDays > 0)
        parts.push(`${totalDays} day${totalDays > 1 ? 's' : ''}`);

      if (showHours && totalHours > 0)
        parts.push(`${totalHours} hr${totalHours > 1 ? 's' : ''}`);

      if (showMinutes && totalMinutes > 0)
        parts.push(`${totalMinutes} min`);

      if (showSeconds && totalSeconds > 0)
        parts.push(`${totalSeconds} s`);

      if (showMilliseconds && totalMilliseconds > 0)
        parts.push(`${totalMilliseconds} ms`);

      return parts.join(', ');
    };

    /**
     * @param {Date} one - date
     * @param {Date} two - date
     */
    const diff = (one, two) => {
      const larger = one > two ? one : two;
      const smaller = one < two ? one : two;

      const milliseconds = larger.getTime() - smaller.getTime();
      const seconds = parseFloat((milliseconds / 1000).toFixed(2));
      const minutes = parseFloat((seconds / 60).toFixed(2));
      const hours = parseFloat((minutes / 60).toFixed(2));
      const days = parseFloat((hours / 24).toFixed(2));

      const yearDiff = larger.getFullYear() - smaller.getFullYear();
      const monthDiff = larger.getMonth() - smaller.getMonth();
      const dayDiff = larger.getDate() - smaller.getDate();

      // bit of just an approx here....
      const monthRatio = parseFloat((dayDiff / 30.437).toFixed(2));
      const totalMonths = monthDiff + monthRatio + (yearDiff * 12);

      const months = totalMonths;
      const years = parseFloat((months / 12).toFixed(10));

      const pretty = ({ hours, minutes, seconds, milliseconds } = {}) => prettyDiff(larger, smaller, { hours, minutes, seconds, milliseconds });

      return { years, months, days, hours, minutes, seconds, milliseconds, pretty };
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const compare = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const d = new Date(dt);
      const s = new Date(start);
      const e = new Date(end);

      if (!time) {
        apply(d, { hours: 0, seconds: 0, milliseconds: 0 });
        apply(s, { hours: 0, seconds: 0, milliseconds: 0 });
        apply(e, { hours: 0, seconds: 0, milliseconds: 0 });
      }

      const gt = includeStart ? d >= s : d > s;
      const lt = includeEnd ? d <= e : d < e;

      return { gt, lt };
    };

    /**
     * Calculates interval from now to the provided date
     * @param {Date} to - date
     * @param {object} [options] - optional options
     * @param {'year' | 'month' | 'day'} [options.cutoff] - when to cutoff to just the date vs the diff
     */
    const interval = (to, { cutoff } = {}) => {
      const from = new Date();
      const isPast = from > to;
      const larger = isPast ? from : to;
      const smaller = !isPast ? from : to;

      const { years, months, days, hours, minutes, seconds, pretty } = diff(from, to);

      const hasBeenYears = years >= 1;
      const hasBeenMonths = months >= 1;
      const hasBeenDays = days >= 1;
      const hasBeenHours = hasBeenDays || hours >= 1;
      const hasBeenMinutes = hasBeenHours || minutes >= 1;
      const hasBeenSeconds = hasBeenMinutes || seconds >= 1;

      const isPastCutoff = !!cutoff
        && (
          (cutoff === 'year' && hasBeenYears)
          || (cutoff === 'month' && hasBeenMonths)
          || (cutoff === 'day' && hasBeenDays)
        );

      if (isPastCutoff)
        return to.toLocaleDateString();

      const suffix = isPast ? ' ago' : '';

      if (hasBeenMonths)
        return `${prettyDiff(larger, smaller)}${suffix}`;

      if (hasBeenDays)
        return `${prettyDiff(larger, smaller, { hours: true })}${suffix}`;

      if (hasBeenHours || hasBeenMinutes)
        return `${pretty({ minutes: true })}${suffix}`;

      if (hasBeenSeconds)
        return `${pretty({ seconds: true })}${suffix}`;

      return 'Just now';
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const between = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const { gt, lt } = compare(dt, start, end, { time, includeStart, includeEnd });
      return gt && lt;
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const clamp = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const { gt, lt } = compare(dt, start, end, { time, includeStart, includeEnd });
      return (gt && lt) || (!gt && !lt) ? new Date(dt)
        : !gt ? new Date(start)
          : new Date(end);
    };

    const api = {
      build,
      fromString,
      update,
      add,
      subtract,
      min,
      max,
      diff,
      interval,
      between,
      clamp
    };

    return api;
  }

}
class AppsSchemaValidation {

  /**
   * Not sure if this is helpfull, but could be mildly for performance when do a lot of real-time validation
   * Saves a little time and space to have a cached 'singleton' type instances, but could be a bad pattern, dunno really...
   */
  static instance() {
    if (!AppsSchemaValidation.__instance__)
      AppsSchemaValidation.__instance__ = AppsSchemaValidation.asv();

    /** @type {Asv>} */
    const instance = AppsSchemaValidation.__instance__;
    return instance;
  }

  static asv() {
    //TODO: what kinda options do we even have here?
    // dunno...

    //TODO: factor out some share functionality so we dont need quite as much duplication!
    //TODO: static array definitiions ['string', 'number'] would be valid for ['abc', 123] but not [123, 'abc']
    //TODO: enum and enumlist type supprt

    //TODO: parser for errors... maybe an array of errors with prop names, could be useful here and there

    const sym = Symbol('validation');

    const isRawSimpleSchema = (obj) => !isNullish(obj) && typeof obj.type === 'string';
    const isSchema = (obj) => !isNullish(obj) && !!obj[sym];
    const isSchemaType = (obj) => isSchema(obj) || Object.values(obj).every(isSchema);

    const isNullish = (v) => v === null || v === undefined || v === '';
    const isMissing = (v) => isNullish(v) || Number.isNaN(v) || (Array.isArray(v) && v.length === 0);
    const verifyWithMessage = (valid, /** @type {string} */ msg) => !valid && msg;

    const helpers = {
      functionInGlobal: (prop, fnName) => (prop in globalThis && !isNullish(globalThis[prop]) && typeof globalThis[prop][fnName] === 'function'),
      pseudoRandomId: () => {
        //TODO: improve this
        const chars = ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'];
        const LEN = 10;
        let id = '';
        for (let i = 0; i < LEN; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          id += char;
        }
        return id;
      },
      generateId: () => helpers.functionInGlobal('Utilities', 'getUuid')
        ? Utilities.getUuid()
        : helpers.functionInGlobal('crypto', 'randomUUID')
          ? crypto.randomUUID()
          : helpers.pseudoRandomId(),
      getAuditUser: () => helpers.functionInGlobal('Session', 'getActiveUser')
        ? Session.getActiveUser().getEmail()
        : null
    };

    //TODO: val or length check....
    const checks = {
      required: (val) => verifyWithMessage(!isMissing(val), 'Is required'),
      max: (/** @type {number} */ mx) => (val) => !isNullish(val) && verifyWithMessage(val <= mx, `Must be less than ${mx}`),
      min: (/** @type {number} */ mn) => (val) => !isNullish(val) && verifyWithMessage(val >= mn, `Must be greater than ${mn}`),
      maxlength: (/** @type {number} */ mx) => (val) => !isNullish(val) && verifyWithMessage(val.length <= mx, `Must be less than ${mx} in length`),
      minlength: (/** @type {number} */ mn) => (val) => !isNullish(val) && verifyWithMessage(val.length >= mn, `Must be greater than ${mn} in length`),
      any: {
        is: () => false,
        toStorage: (val) => String(val),
        fromStorage: (val) => val,
      },
      number: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'number', 'Is not a number'),
        toStorage: (val) => isNullish(val) ? null : Number(val),
        fromStorage: (val) => isNullish(val) ? null : Number(val),
      },
      string: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      id: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string id'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      audit: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string audit'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      url: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && val.startsWith('https://'), "Is not an 'https://' url"),
        sanitize: (/** @type {string} */ val) => isNullish(val) ? null
          : /^(https:\/\/)/i.test(val) ? val : null,
        toStorage: (val) => isNullish(val) ? null : checks.url.sanitize(val),
        fromStorage: (val) => isNullish(val) ? null : checks.url.sanitize(val),
      },
      boolean: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'boolean', 'Is not a boolean'),
        toStorage: (val) => isNullish(val) ? null : Boolean(val),
        fromStorage: (val) => isNullish(val) ? null : Boolean(val),
      },
      date: {
        is: (val) => !isNullish(val) && verifyWithMessage(val instanceof Date, 'Is not a date'),
        toStorage: (val) => isNullish(val) ? null : new Date(val),
        fromStorage: (val) => isNullish(val) ? null : new Date(val),
      },
      datestring: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}/.test(val), 'Is not a date-string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('T')[0];
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('T')[0];
          return null;
        },
      },
      datetimestring: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}(:[\d]{0,2})?/.test(val), 'Is not a datetime string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('.')[0];
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}T${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}:00`;
          return null;
        },
      },
      jsondate: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}[A-Z]/.test(val), 'Is not a json date string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
      },
      timestamp: {
        is: (val) => checks.jsondate.is(val),
        toStorage: (val) => {
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          if (typeof val === 'object' && !isNullish(val.seconds)) {
            const tts = new Date(0);
            tts.setUTCSeconds(val.seconds);
            return tts.toJSON();
          }
          return null;
        },
      },
      array: {
        is: (val) => !isNullish(val) && verifyWithMessage(Array.isArray(val), 'Is not an array'),
        toStorageRaw: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return val;
          return null;
        },
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return JSON.stringify(val);
          if (typeof val === 'string' && val !== '') return val;
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : null;
          };
          return null;
        },
      },
      object: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'object', 'Is not an object'),
        toStorageRaw: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return val;
          return null;
        },
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'string' && val !== '') return val;
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return val;
          if (typeof val === 'string') return JSON.parse(val);
          return null;
        },
      },
      file: {
        is: (val) => checks.object.is(val),
        toStorage: (val) => checks.object.toStorage(val),
        fromStorage: (val) => checks.object.fromStorage(val),
        types: (types) => (val) => !isNullish(val) && verifyWithMessage(types.some(val.type), 'Is not an accepted file type'),
        size: (mx) => (val) => !isNullish(val) && verifyWithMessage(val.size <= mx, 'Is too large'),
      }
    };

    /**
     * Base object for scheme definition
     * @param {AsvSchemeType} type 
     */
    const base = (type) => {
      /** @type {BaseAsvTypeContext} */
      const ctx = {
        type,
        rules: [],
        client: {},
        defaultFn: undefined,
        updateFn: undefined,
        sub: {
          schema: undefined,
          isSimple: false
        },
        valid: {
          isValid: (val, mdl) => !ctx.valid.check || verifyWithMessage(ctx.valid.check(val, mdl), ctx.valid.msg),
          check: undefined,
          msg: ''
        },
      };

      const hasLength = ctx.type === 'array'
        || ctx.type === 'string';

      /** @type {BaseAsvType} */
      const api = {
        [sym]: true,
        type: ctx.type,
        required: () => {
          ctx.rules.push(checks.required);
          ctx.client.required = true;
          return api;
        },
        max: (mx) => {
          if (hasLength) {
            ctx.rules.push(checks.maxlength(mx));
            ctx.client.maxlength = mx;
          } else {
            ctx.rules.push(checks.max(mx));
            ctx.client.max = mx;
          }
          return api;
        },
        min: (mn) => {
          if (hasLength) {
            ctx.rules.push(checks.minlength(mn));
            ctx.client.minlength = mn;
          } else {
            ctx.rules.push(checks.min(mn));
            ctx.client.min = mn;
          }
          return api;
        },
        default: (fn) => {
          ctx.defaultFn = fn;
          return api;
        },
        update: (fn) => {
          ctx.updateFn = fn;
          return api;
        },
        valid: (fn, msg) => {
          // fn = (val, model) => {}
          ctx.valid.check = fn;
          ctx.valid.msg = msg || 'Is not valid';
          ctx.rules.push(ctx.valid.isValid);
          return api;
        },
        resolver: (fn) => {
          ctx.resolver = fn;
          return api;
        },
        schema: (obj) => {
          ctx.sub.isSimple = isSchema(obj) || isRawSimpleSchema(obj);
          ctx.sub.schema = isSchema(obj) ? { v: obj }
            : isSchemaType(obj) ? obj
              : ctx.sub.isSimple ? fromRaw({ v: obj }) : fromRaw(obj);
          return api;
        },
        client: {
          get: ctx.client,
          set: (/** @type {{ [key: string]: string }} */ vals) => {
            Object.entries(vals).forEach(([key, val]) => ctx.client[key] = val);
            return api;
          }
        },

        evaluate: (val, model) => {
          const results = {
            errors: ctx.rules.map(rule => rule(val, model)).filter(r => !!r),
            hasError: false,
          };
          let hasError = results.errors.length > 0;

          if (ctx.sub.schema && !isNullish(val)) {

            if (ctx.type === 'array' && Array.isArray(val)) {
              const subvalidation = val.map(entry => {
                const res = validateComplete(ctx.sub.schema, ctx.sub.isSimple ? { v: entry } : entry, model);

                hasError = hasError || res.hasError;
                return ctx.sub.isSimple ? res.item.v : res;
              });
              results.items = subvalidation;

            } else {

              const subvalidation = validateComplete(ctx.sub.schema, val, model);
              results.errors = [...results.errors, ...subvalidation.errors];
              results.item = subvalidation.item;
              hasError = hasError || subvalidation.hasError;

            }
          }

          results.hasError = hasError;
          return results;
        },
        apply: (val, model, { isNew } = {}) => {
          if (isNew && isNullish(val) && ctx.defaultFn) val = ctx.defaultFn();
          if (ctx.updateFn) val = ctx.updateFn(model);
          if (ctx.resolver) val = ctx.resolver(val);
          if (ctx.sub.schema && !isNullish(val))

            if (ctx.type === 'array' && Array.isArray(val)) {

              val = val.map(entry => {
                const res = applyComplete(ctx.sub.schema, ctx.sub.isSimple ? { v: entry } : entry, model, { isNew, noStringify: true })
                return ctx.sub.isSimple ? res.v : res;
              });

            } else {

              val = applyComplete(ctx.sub.schema, val, model, { isNew })

            }

          return val;
        },
        exec: (val, model, { isNew, noStringify } = {}) => {
          const applied = api.apply(val, model, { isNew });
          const validation = api.evaluate(applied, model);
          const storage = noStringify ? checks[ctx.type].toStorageRaw(applied) : checks[ctx.type].toStorage(applied);
          return { validation, storage };
        },

        parse: (val) => checks[ctx.type].fromStorage(val),
      };

      return { ctx, api };
    };

    const types = {

      /** @returns {AsvAny} */
      any: () => {
        const { api } = base('any');

        return api;
      },

      /** @returns {AsvNumber} */
      number: () => {
        const { ctx, api } = base('number');

        ctx.rules.push(checks.number.is);
        api.client.set({ type: 'number' });

        return api;
      },

      /** @returns {AsvString} */
      string: () => {
        const { ctx, api } = base('string');

        ctx.rules.push(checks.string.is);
        api.client.set({ type: 'text' });

        return api;
      },

      /** @returns {AsvId} */
      id: () => {
        const { ctx, api } = base('id');

        ctx.rules.push(checks.id.is);
        api.client.set({ type: 'text' });

        ctx.defaultFn = helpers.generateId;

        return api;
      },

      /** @returns {AsvUrl} */
      url: () => {
        const { ctx, api } = base('url');

        ctx.rules.push(checks.url.is);
        api.client.set({ type: 'text' });

        return api;
      },

      /** @returns {AsvBoolean} */
      boolean: () => {
        const { ctx, api } = base('boolean');

        ctx.rules.push(checks.boolean.is);

        return api;
      },

      /** @returns {AsvDate} */
      date: () => {
        const { ctx, api } = base('date');

        ctx.rules.push(checks.date.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvDateString} */
      datestring: () => {
        const { ctx, api } = base('datestring');

        ctx.rules.push(checks.datestring.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvDateTimeString} */
      datetimestring: () => {
        const { ctx, api } = base('datetimestring');

        ctx.rules.push(checks.datetimestring.is);
        api.client.set({ type: 'datetime-local' });

        return api;
      },

      /** @returns {AsvJsonDate} */
      jsondate: () => {
        const { ctx, api } = base('jsondate');

        ctx.rules.push(checks.jsondate.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvTimestamp} */
      timestamp: () => {
        const { ctx, api } = base('timestamp');

        ctx.rules.push(checks.timestamp.is);
        api.client.set({ type: 'datetime-local' });

        api.default = () => {
          ctx.defaultFn = () => new Date().toJSON();
          return api;
        };

        api.update = () => {
          ctx.updateFn = () => new Date().toJSON();
          return api;
        };

        return api;
      },

      /** @returns {AsvAudit} */
      audit: () => {
        const { ctx, api } = base('audit');

        ctx.rules.push(checks.audit.is);
        api.client.set({ type: 'text' });

        const getter = helpers.getAuditUser;

        api.default = () => {
          ctx.defaultFn = getter;
          return api;
        };

        api.update = () => {
          ctx.updateFn = getter;
          return api;
        };

        return api;
      },

      /** @returns {AsvArray} */
      array: () => {
        const { ctx, api } = base('array');

        ctx.rules.push(checks.array.is);

        return api;
      },

      /** @returns {AsvObject} */
      object: () => {
        const { ctx, api } = base('object');

        ctx.rules.push(checks.object.is);

        return api;
      },

      /** @returns {AsvFile} */
      file: () => {
        const { ctx, api } = base('file');

        ctx.rules.push(checks.file.is);
        api.client.set({ max: 1 });

        ctx.sub.schema = {
          id: types.string(),
          name: types.string(),
          url: types.url(),
          size: types.number(),
          type: types.string()
        };

        api.types = (types) => {
          const acceptedTypes = Array.isArray(types) ? types : String(types).split(',').map(t => t.trim());
          ctx.rules.push(checks.file.types(acceptedTypes));
          ctx.client.accept = acceptedTypes.join(',');
          return api;
        };

        api.size = (mx) => {
          ctx.rules.push(checks.file.size(mx));
          ctx.client.maxsize = mx;
          return api;
        };

        return api;
      }

    };

    const validateComplete = (scheme, obj, model) => {
      const results = { errors: [], item: {}, hasError: false };
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;
        const evaluated = sch.evaluate(value, model);
        results.item[key] = evaluated;
        results.hasError = results.hasError || evaluated.hasError;
      });

      return results;
    };

    /** @type {AsvValidate} */
    const validate = (schema, obj, { throwError } = {}) => {
      const results = validateComplete(schema, obj, obj);
      if (throwError && results.hasError)
        throw new Error(JSON.stringify(results));

      return results;
    };

    /** @type {AsvApply} */
    const applyComplete = (scheme, obj, model, { isNew, noStringify }) => {
      const newObj = {};
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;

        newObj[key] = sch.apply(value, model, { isNew, noStringify });
      });

      return newObj;
    };

    const execComplete = (scheme, obj, model, { isNew, noStringify }) => {
      const newObj = {};
      const results = {};
      let hasError = false;
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;
        const { storage, validation } = sch.exec(value, model, { isNew, noStringify });

        newObj[key] = storage;
        results[key] = validation.errors;
        hasError = hasError || validation.hasError;
      });

      return { newObj, results, hasError };
    };

    /** @type {AsvExec} */
    const exec = (scheme, obj, { isNew, throwError }) => {
      const { newObj, results, hasError } = execComplete(scheme, obj, obj, { isNew });
      if (hasError && throwError)
        throw new Error(JSON.stringify(results));

      return newObj;
    };

    const errorsToArray = (results, path = '') => {
      // get array of failures with path and errors
      if (!results.hasError)
        return [];

      /** @type {{ path: string, errors: string[] }[]} */
      let errors = [];

      let topErrors = results.errors || [];
      if (topErrors.length > 0)
        errors.push({ path, errors: topErrors });

      const item = results.item || {};

      Object.entries(item).forEach(([key, res]) => {
        if (res.errors.length > 0)
          errors.push({ path: `${path}${key}`, errors: res.errors });

        if (Array.isArray(res.items))
          errors = [...errors, ...res.items.map((ch, i) => errorsToArray(ch, `${path}${key}[${i}].`)).flat()];

        if (res.item)
          errors = [...errors, ...errorsToArray(res, `${path}${key}.`)];
      });

      const items = results.items || [];
      items.forEach(res => {
        errors = [...errors, ...errorsToArray(res, path)];
      });

      return errors;
    };

    /** @type {AsvParse} */
    const parseComplete = (scheme, obj) => {
      const newObj = {};
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;

        newObj[key] = sch.parse(value);
      });

      return newObj;
    };

    /** @type {AsvGenerate} */
    const genComplete = (scheme, obj, model, { empty }) => {
      Object.entries(scheme).forEach(([key, sch]) => {
        let value = empty ? null : sch.apply(null, model, { isNew: true });
        if (!isNullish(value) && typeof value === 'object' && sch.schema)
          value = genComplete(sch.schema, value, model);
        obj[key] = value;
      });
      return obj;
    };

    /** @type {AsvGetSchemaContext} */
    const build = (schema) => getContext(schema);

    /** @type {AsvFromRaw} */
    const fromRaw = (raw) => {
      const built = {};

      Object.entries(raw).forEach(([key, sch]) => {
        const creator = types[sch.type];
        if (!creator)
          throw new Error(`${sch.type} is not a valid AppsSchemaValidation type!`);

        const type = creator();

        if (sch.required) type.required();
        if (sch.max !== undefined) type.max(sch.max);
        if (sch.min !== undefined) type.min(sch.min);
        if (sch.default) type.default(sch.default);
        if (sch.update) {
          if (typeof sch.update === 'function')
            type.update(sch.update);
          else
            type.update(sch.update.fn, sch.update.msg);
        }

        if (sch.schema) type.schema(sch.schema);
        if (sch.resolver) type.resolver(sch.resolver);

        //File
        if (sch.types) type.types(sch.types);
        if (sch.size) type.size(sch.size);

        //Client
        if (sch.client) type.client.set(sch.client);

        built[key] = type;
      });

      return built;
    };

    /** 
     * @template R
     * 
     * @param {AsvRawSchema<R>} raw
     */
    const compile = (raw) => {
      
      const built = fromRaw(raw);
      return build(built);
    };

    /** @type {AsvGetSchemaContext} */
    const getContext = (schema) => {
      return {
        schema,
        test: (obj) => validate(schema, obj, { throwError: true }),
        apply: (obj, { isNew } = {}) => applyComplete(schema, obj, obj, { isNew }),
        validate: (obj, { throwError = false } = {}) => validate(schema, obj, { throwError }),
        exec: (obj, { isNew, throwError = true } = {}) => exec(schema, obj, { isNew, throwError }),
        errors: (obj) => errorsToArray(validate(schema, obj)),
        parse: (obj) => parseComplete(schema, obj),
        generate: (obj = {}, { empty = false } = {}) => genComplete(schema, obj, obj, { empty })
      };
    };

    return {
      ...types,
      build,
      compile
    };
  }

}
class DataModel {

  /**
   * Data model definition for app data
   */
  static model() {
    return {
      Project: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        name: {
          required: true,
          type: 'string'
        },
        description: {
          required: true,
          type: 'string',
          client: { type: 'textarea' }
        },
        version: {
          required: true,
          type: 'string'
        },
        status: {
          required: true,
          type: 'string'
        },
        categories: {
          type: 'array',
          default: () => []
        },
        platforms: {
          required: true,
          type: 'array',
          default: () => []
        },
        dependsOnProjects: {
          type: 'array',
          default: () => []
        },
        priority: {
          required: true,
          type: 'string',
        },
        accessibilityStatus: {
          type: 'string',
        },
        iteration: {
          type: 'datestring'
        },
        planningNotes: {
          type: 'string',
          client: { type: 'textarea' }
        },
        program: {
          required: true,
          type: 'string',
        },
        hasPII: {
          type: 'boolean',
        },
        links: {
          type: 'array',
          default: () => [],
          resolver: (val) => val.map(({ name, url, type }) => ({ name, url: SecurityServices.sanitizeUrl(url), type }))
        },
        owner: {
          required: true,
          type: 'string',
          default: () => Session.getActiveUser().getEmail()
        },
        backup: {
          required: true,
          type: 'string',
        },
        isPublic: {
          type: 'boolean',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Deployment: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        project: {
          required: true,
          type: 'string'
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        version: {
          required: true,
          type: 'string'
        },
        owner: {
          required: true,
          type: 'string',
          default: () => Session.getActiveUser().getEmail()
        },
        scheduled: {
          type: 'datetimestring'
        },
        date: {
          required: true,
          type: 'datestring',
        },
        tags: {
          type: 'array',
          default: () => []
        },
        notes: {
          type: 'string',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Timeline: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        projects: {
          type: 'array',
          default: () => []
        },
        name: {
          required: true,
          type: 'string'
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        status: {
          required: true,
          type: 'string'
        },
        effort: {
          type: 'number',
        },
        priority: {
          type: 'number',
        },
        magnitude: {
          type: 'number',
        },
        impacts: {
          type: 'array',
          default: () => []
        },
        notes: {
          type: 'string',
          client: { type: 'textarea' }
        },
        startDate: {
          required: true,
          type: 'datestring',
        },
        endDate: {
          required: true,
          type: 'datestring',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Item: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        itemNumber: {
          type: 'number',
          default: () => {
            if (typeof CurrentEnvironment === 'undefined')
              return;
            const config = CurrentEnvironment.config();
            if (config.environment !== 'production')
              return 0;

            const ITEM_NUMBER_PROPERTY_KEY = '__item_number__';
            const lock = LockService.getScriptLock();
            lock.waitLock(10000);
            const props = PropertiesService.getScriptProperties();

            const nextNum = parseInt(props.getProperty(ITEM_NUMBER_PROPERTY_KEY)) || 0;
            props.setProperty(ITEM_NUMBER_PROPERTY_KEY, nextNum + 1);

            lock.releaseLock();
            return nextNum;
          }
        },
        project: {
          type: 'string',
          required: true
        },
        deployment: {
          type: 'string',
        },
        parent: {
          type: 'string'
        },
        name: {
          type: 'string',
          required: true
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        tags: {
          type: 'array',
          default: () => []
        },
        files: {
          type: 'array',
          default: () => [],
          max: 10,
          schema: { type: 'file' }
        },
        version: {
          required: true,
          type: 'string'
        },
        type: {
          required: true,
          type: 'string'
        },
        priority: {
          required: true,
          type: 'string'
        },
        status: {
          required: true,
          type: 'string'
        },
        scheduledDate: {
          type: 'datetimestring'
        },
        hours: {
          type: 'number'
        },
        resolvedDate: {
          type: 'datestring'
        },
        closedDate: {
          type: 'datestring'
        },
        assignee: {
          required: true,
          type: 'string'
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Comment: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        item: {
          required: true,
          type: 'string'
        },
        comment: {
          required: true,
          type: 'string',
          client: { type: 'textarea' }
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      User: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        email: {
          required: true,
          type: 'string'
        },
        settings: {
          type: 'object',
          default: () => ({ favoriteProjects: [] })
        },
        role: {
          type: 'string'
        },
        createdDate: {
          type: 'timestamp',
          default: true
        }
      },

      Config: {
        _key: {
          type: 'string'
        },
        id: {
          required: true,
          type: 'string'
        },
        json: {
          required: true,
          type: 'object'
        }
      }
    }
  }

  /**
   * ASV compiled schemas for the data model
   */
  static schema() {
    const asv = AppsSchemaValidation.asv();
    const model = DataModel.model();

    return {
      Project: asv.compile(model.Project),
      Timeline: asv.compile(model.Timeline),
      // Deployment: asv.compile(model.Deployment),
      Item: asv.compile(model.Item),
      Comment: asv.compile(model.Comment),
      User: asv.compile(model.User),
      Config: asv.compile(model.Config)
    };
  }
}

class AppSheetAPI {

  /**
   * Creates a new api object
   * @param {String} id - appsheet app Id
   * @param {String} key - appsheet api key
   */
  static create(id, key) {
    const url = `https://api.appsheet.com/api/v2/apps/${id}/tables`;

    /**
     * Composes fetch options
     * @param {Object} body - body of fetch request
     * @param {String} [url] - optional url of request
     */
    const options = (body, url = undefined) => ({
      url,
      method: 'post',
      contentType: 'application/json',
      headers: {
        applicationAccessKey: key
      },
      payload: JSON.stringify(body)
    });

    /**
     * Constructs the body of an AppSheet request
     * @param {Object} options - body options
     */
    const formatBody = ({ action = 'Find', properties = {}, rows = [] }) => ({
      Action: action,
      Properties: {
        Locale: properties.locale || 'en-US',
        Location: properties.location,
        Timezone: properties.timezone || 'Mountain Standard Time',
        UserSettings: properties.userSettings || {},
        Selector: properties.selector
      },
      Rows: rows
    });

    /**
     * Sends a single request
     * @param {String} endpoint - endpoint for request (with leading '/') 
     * @param {Object} body - AppSheet request body
     */
    const send = (endpoint, body) => {
      if (!body)
        throw new Error('No AppSheetAPI request body set!');

      const response = UrlFetchApp.fetch(`${url}${endpoint}`, options(body));

      if (response.getResponseCode() !== 200)
        throw new Error(`AppSheetAPI request failed: ${response.getContentText()}`);

      return JSON.parse(response.getContentText() || undefined);
    };

    /**
     * Sends an array of requests
     * @param {Object[]} requests - array of requests
     */
    const all = (requests) => {
      if (!requests || requests.length === 0)
        throw new Error('No requests to send');

      const responses = UrlFetchApp.fetchAll(requests);

      const failures = responses.filter(res => res.getResponseCode() !== 200);
      if (failures.length > 0)
        throw new Error(`AppSheetAPI request failed:\n\n${failures.map(f => f.getContentText()).join('\n\n')}`);

      return responses.map(res => JSON.parse(res.getContentText() || undefined));
    }

    /**
     * Builds a request to be sent by calling the returned 'post' methind with the endpoint to post to
     * @param {Object} options - request body options
     */
    const body = ({ action = 'Find', properties = {}, rows = [] }) => ({
      postSync: (endpoint) => send(endpoint, formatBody({ action, properties, rows }))
    });

    /**
     * Builds a batcher to create a list of requests to be sent all together
     */
    const batch = () => {
      const requests = [];
      const add = (endpoint, { action = 'Find', properties = {}, rows = [] }) => {
        requests.push(options(formatBody({ action, properties, rows }), `${url}${endpoint}`));
        return ret;
      };

      const ret = {
        add,
        postAll: () => all(requests)
      };

      return ret;
    };

    const api = {
      body,
      batch
    };

    return api;
  }

}
/**
 * Class for handling data access to app data google sheet
 * Expects each collection to have an id property that is treated as the unique identifier for that record
 */
class SheetDataAccess {

  /**
   * Constructor function
   * @param {Object} source - Spreadsheet source options
   * @param {string} [source.id] - Spreadsheet id
   * @param {Object} [source.ss] - Spreadsheet object
   * @param {Object} [options] - options object
   * @param {Schema} [options.schemas] - optional Schemas to apply to the datasource objects
   */
  constructor({ id, ss }, { schemas } = {}) {

    this.spreadsheet = ss || SpreadsheetApp.openById(id);
    this.collections = {};
    this.hasSchema = !!schemas;

    const sheets = this.spreadsheet.getSheets();
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      //allow for additional sheets to be left out of the datasource if prefixed with _;
      if (sheetName[0] !== '_') {

        let schema;
        if (this.hasSchema) {
          schema = schemas[sheetName];
          if (!schema)
            throw new Error(`${sheetName} has no schema model provided!`);
        }

        this.collections[sheetName] = new SheetDataCollection(sheet, { schema });
      }
    });
  }

  /**
   * Static helper prop for the offset from the Sheet row and the eventual data array index
   */
  static get ROW_INDEX_OFFSET() {
    return 2;
  }

  /**
   * Cell usage cap
   * //https://support.google.com/drive/answer/37603
   */
  static get CELL_CAP() {
    return 10000000;
  }

  /**
   * maps an array of data to an object with headers of the row as property keys
   * @param {Array<Any>} row - row of data to map to object
   * @param {number} index - index of the object within the data array
   * @param {Array<string>} headers - array of header names in the order of appearance in sheet
   * @returns {Object} mapped object
   */
  static getRowAsObject(row, index, headers) {
    const obj = {
      _key: index + SheetDataAccess.ROW_INDEX_OFFSET
    };

    headers.forEach((header, index) => obj[header] = row[index]);
    return obj;
  };

  /**
   * Clears all empty rows from all collections
   */
  defrag() {
    Object.values(this.collections).forEach(coll => coll.defrag());
    return this;
  }

  /**
   * Archives entire spreadsheet content
   */
  wipe() {
    Object.values(this.collections).forEach(coll => coll.wipe());
    return this;
  }

  /**
   * Archives entire spreadsheet content
   * @param {string} folderId - id of sheet to archive to
   */
  archive(folderId) {
    const folder = DriveApp.getFolderById(folderId);
    const copy = this.spreadsheet.copy(`${this.spreadsheet.getName()}_${new Date().toJSON()}`);
    const file = DriveApp.getFileById(copy.getId());
    file.moveTo(folder);

    return this.wipe();
  }

  /**
   * Returns a usage percent report
   */
  inspect() {

    const breakdowns = Object.values(this.collections)
      .map(coll => coll.inspect());

    const totalRows = breakdowns.map(rep => rep.totalRows).reduce((sum, count) => sum += count, 0);
    const totalColumns = breakdowns.map(rep => rep.totalColumns).reduce((sum, count) => sum += count, 0);
    const totalCells = breakdowns.map(rep => rep.totalCells).reduce((sum, count) => sum += count, 0);
    const usagePercent = breakdowns.map(rep => rep.usagePercent).reduce((ttl, pct) => ttl += pct, 0) / (breakdowns.length || 1);

    const report = {
      summary: {
        totalRows,
        totalColumns,
        totalCells,
        usagePercent
      },
      breakdowns
    };

    return report;
  }

}

/**
 * Class that manages read writes to a specific collection of data based on a sheet
 */
class SheetDataCollection {
  /**
   * @param {Sheet} sheet - sheet for the collection of data
   * @param {Object} [options] - collections options
   * @param {Schema} [options.schema] - schema to apply to the collection 
   */
  constructor(sheet, { schema } = {}) {
    this.sheet = sheet;
    this.schema = schema;
    this.hasModel = !!schema;
    this._data = null;
    this._index = {};
    this._related = {};
    this._pkColumnIndex = 0;
  }

  /**
   * Sets the index of the pk column (only necessary if not 0)
   * @param {number} index - col index of pk field
   */
  pk(index) {
    this._pkColumnIndex = index;
    return this;
  }

  /**
   * setup any props needed for data writing methods
   */
  _init() {
    this.COLUMN_COUNT = this.sheet.getLastColumn();

    //check for cache
    if (!this._data) {
      this.headerRow = this.sheet.getRange(1, 1, 1, this.COLUMN_COUNT).getValues()[0];
    }
  }

  _values() {
    return this.sheet.getSheetValues(1, 1, this.rowCount(), this.sheet.getLastColumn());
  }

  /**
   * 
   * @param {Array} row - data row array
   * @param {Number} index - index of the data in the dataset
   * @returns {Object} row data mapped to an object
   */
  _getObject(row, index) {
    const obj = SheetDataAccess.getRowAsObject(row, index, this.headerRow);
    return this.hasModel ? this.schema.parse(obj) : obj;
  }

  /**
   * Gets shallow copies of records to save, applies schema if exists
   * @param {Object[]} records - records to get saveable array
   * @returns {Object[]} new array of shallow copied/schema applied records
   */
  _getRecordsToSave(records, { ignoreErrors } = {}) {
    if (!this.hasModel)
      return records.map(rec => ({ ...rec }));

    return records.map((rec) => this.schema.exec(rec, { isNew: !rec._key, throwError: !ignoreErrors }));
  }

  /**
   * Gets records from schema or shallow copies if none
   * @param {Object[]} records - records to get from schema 
   */
  _getFromSchemaRecords(records) {
    if (!this.hasModel)
      return records.map(rec => ({ ...rec }));

    return records.map(this.schema.parse);
  }

  /**
   * Gets current row count
   */
  rowCount() {
    return this.sheet.getLastRow();
  }

  /**
   * Helper to clear cached data to force refreshes
   * @returns {SheetDataCollection} - this for chaining
   */
  clearCached() {
    this._data = null;
    this._index = {};
    this._related = {};

    return this;
  }

  /**
   * Helper function that will replace the top row of a sheet with headers from the provided obj
   * @param {Object} obj - object with headers to write
   * @returns {SheetDataCollection} - this for chaining
   */
  writeHeadersFromObject(obj) {
    const sheet = this.sheet;
    const firstRow = sheet.getRange(1, 1, 1, sheet.getMaxColumns());
    firstRow.clear();

    const headers = Object.keys(obj);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    return this;
  }

  /**
   * Caches and returns a unique key map
   * @param {string} [key] - optional id
   * @returns {Object} index map
   */
  index(key = 'id') {
    if (!this._index[key]) {

      const data = this.data();

      const index = data.reduce((obj, record) => {
        obj[record[key]] = record;
        return obj;
      }, {});

      this._index[key] = index;
    }

    return this._index[key];
  }

  /**
   * Creates and returns a map of related items
   * @param {string} key - property key of related set to get
   * @returns {Object} related map
   */
  related(key) {
    if (!this._related[key]) {

      const data = this.data();

      const related = data.reduce((obj, record) => {
        if (!obj[record[key]])
          obj[record[key]] = [record]
        else
          obj[record[key]].push(record);

        return obj;
      }, {});

      this._related[key] = related;
    }

    return this._related[key];
  }

  /**
   * Enforces uniqueness of a given prop within the collection (throws an error if not unique)
   * @param {Object} rec - record to enforce unique
   * @param {string} prop - prop to enforce being unique
   */
  enforceUnique(rec, prop) {
    if (!rec._key) {
      const index = this.index(prop);
      if (index[rec[prop]] !== undefined)
        throw new Error(`${this.sheet.getName()} ${prop} prop value ${rec[prop]} already exists!`);
    } else {
      // is the best to just filter it out??
      const others = this.data().filter(oth => oth._key !== rec._key);
      const set = new Set(others.map(oth => oth[prop]));
      if (set.has(rec[prop]))
        throw new Error(`${this.sheet.getName()} ${prop} prop value ${rec[prop]} already exists!`);
    }

    return this;
  }

  /**
   * Handles retrieving and caching item data from sheet
   * @returns {Object[]} array of all item data
   */
  data() {
    if (this._data === null) {
      const values = this._values();

      this.headerRow = values.shift();
      this._data = [];

      values.forEach((row, index) => {
        if (row[this._pkColumnIndex] !== '')
          this._data.push(this._getObject(row, index));
      });
    }

    return this._data;
  }

  /**
   * Streams data in chunks...
   */
  *stream(size) {
    const CHUNK_SIZE = size || 5000;
    let i = 0;

    const sheet = this.sheet;
    this._init();

    const rows = this.rowCount()
    const columns = this.COLUMN_COUNT;

    const chunks = Math.ceil(rows / CHUNK_SIZE);

    while (i < chunks) {
      const startRow = i * CHUNK_SIZE + SheetDataAccess.ROW_INDEX_OFFSET;
      const rowsToGet = Math.min(rows - startRow, CHUNK_SIZE);
      const values = sheet.getSheetValues(startRow, 1, rowsToGet, columns);

      const data = [];
      values.forEach((row, index) => {
        if (row[this._pkColumnIndex] !== '')
          data.push(this._getObject(row, startRow - SheetDataAccess.ROW_INDEX_OFFSET + index));
      });

      i++;
      yield data;
    }
  }

  /**
   * Finds a record by a given key
   * @param {string} key - key of record to get
   * @param {string} [index] - optional index to use, defaults to '_key'
   */
  find(key, index = '_key') {
    const idx = this.index(index);
    return idx[key];
  }

  /**
   * Saves record objects to sheet datasource
   * @param {Object[]} records - record objects to save
   * @returns {Object[]} records in their saved state
   */
  upsert(records, { bypassSchema = false } = {}) {
    if (records.length === 0)
      return records;
    //saves record data objects to the spreadsheet
    //check for cache
    this._init();

    const schemaModels = !bypassSchema ? this._getRecordsToSave(records) : records;

    const updates = schemaModels.filter(rec => rec._key !== undefined && rec._key !== null);
    const adds = schemaModels.filter(rec => rec._key === undefined || rec._key === null);

    this.update(updates, { bypassSchema: true });
    this.add(adds, { bypassSchema: true })

    //clear cached data to force rebuild to account for changed/added records
    this.clearCached();

    return this._getFromSchemaRecords(schemaModels);
  }

  /**
   * Upserts one record (more concurrent safe)
   * @param {Object} record - record to upsert
   * @param {Object} [options] - options
   */
  upsertOne(record, { bypassSchema = false } = {}) {
    if (!record)
      return null;

    const isNew = record._key === undefined || record._key === null;
    const [saved] = isNew ? [this.addOne(record, { bypassSchema })] : this.update([record], { bypassSchema });
    return saved; 
  }

  /**
   * Adds one record (more concurrent safe)
   * @param {Object} record - record to add
   */
  addOne(record, { bypassSchema = false } = {}) {
    //saves record data objects to the spreadsheet
    if (!record)
      return null;

    const sheet = this.sheet;
    this._init();

    const recordToSave = !bypassSchema
      ? this._getRecordsToSave([record])[0]
      : record;

    const startingRowCount = this.rowCount();

    const row = this.headerRow.map(header => recordToSave[header]);
    sheet.appendRow(row);

    const rng = sheet.getRange(startingRowCount, this._pkColumnIndex + 1, this.rowCount());
    const finder = rng.createTextFinder(row[this._pkColumnIndex]);
    const found = finder.findNext();
    if (!found)
      throw new Error('Something went wrong with the add operation!');
    recordToSave._key = found.getRow();

    //clear cached data to force rebuild to account for changed/added records
    this.clearCached();

    //return objects to their from schema state
    //this seems like i should be doing this a different way....
    return this._getFromSchemaRecords([recordToSave])[0];
  }

  /**
   * adds the record models (NOT concurrent safe, use locking if necessary)
   * @param {Object[]} records - records to add to the sheet datasource
   */
  add(records, { bypassSchema = false } = {}) {
    //saves record data objects to the spreadsheet
    if (records.length === 0)
      return [];

    const sheet = this.sheet;
    this._init();

    const recordsToSave = !bypassSchema
      ? this._getRecordsToSave(records)
      : records;

    const rowCount = this.rowCount();
    const recordArrays = recordsToSave
      .map((record, index) => {
        record._key = rowCount + index + 1;
        return this.headerRow.map(header => record[header]);
      });

    const range = sheet.getRange(this.rowCount() + 1, 1, recordsToSave.length, this.COLUMN_COUNT);
    if (!!range.getValues()[0][this._pkColumnIndex])
      throw new Error('Add transaction error, try again!');
    range.setValues(recordArrays);

    //clear cached data to force rebuild to account for changed/added records
    this.clearCached();

    //return objects to their from schema state
    //this seems like i should be doing this a different way....
    return this._getFromSchemaRecords(recordsToSave);
  }

  /**
   * updates the record models
   * @param {Object[]} records - records to update in the sheet datasource
   */
  update(records, { bypassSchema = false } = {}) {
    if (records.length === 0)
      return [];
    //saves record data objects to the spreadsheet
    this._init();

    const recordsToSave = !bypassSchema
      ? this._getRecordsToSave(records)
      : records;

    recordsToSave.forEach(record => {
      const recordValues = this.headerRow.map(header => record[header]);
      this._updateRow(record, recordValues, this.COLUMN_COUNT);
    });

    //clear cached data to force rebuild to account for changed/added records
    this.clearCached();

    //return objects to their from schema state
    //this seems like i should be doing this a different way....
    return this._getFromSchemaRecords(recordsToSave);;
  }

  /**
   * Patches the provided patch props onto existing models 
   * (allows for targeted updates, which could help with multi-users so that entire records arent saved, just the individual changes are applied)
   * @param {Object[]} patches - list of patches to apply
   * @param {Object} options 
   */
  patch(patches, { bypassSchema = false } = {}) {
    if (patches.length === 0)
      return [];

    this._init();

    const patchedRecords = patches.map(patch => {
      const existing = this.find(patch._key);
      if (!existing)
        throw new Error(`Could not patch record with key ${patch._key}. Key not found!`);

      return {
        ...existing,
        ...patch
      };
    });

    return this.update(patchedRecords, { bypassSchema });
  }

  /**
   * deletes record objects to sheet datasource
   */
  delete(records) {
    const sheet = this.sheet;
    //check for cache
    this._init();

    // find each record to remove...
    records.forEach(record => {
      const recordValues = this.headerRow.map(header => record[header]);
      const range = sheet.getRange(record._key, 1, 1, this.COLUMN_COUNT);

      //last second check to make sure 2d array and sheet are still in sync for this object
      if (String(range.getValues()[0][this._pkColumnIndex]) !== String(recordValues[this._pkColumnIndex]))
        throw new Error(`Id at row ${record._key} does not match id of object for ${recordValues[this._pkColumnIndex]}`);

      range.setValues([new Array(this.COLUMN_COUNT)]);
    });

    //clear cached data to force rebuild to account for deleted records
    this.clearCached();
  }

  /**
   * Performs batch update on the entire dataset for (meant for faster but more expensive updates)
   * (NOT concurrent safe, use locking if necessary)
   * @param {Object[]} records - batch data to apply
   * @param {Object} [options] - options
   */
  batch(records, { bypassSchema = false } = {}) {
    if (records.length === 0)
      return records;
    //saves record data objects to the spreadsheet
    //check for cache
    this._init();

    const schemaModels = !bypassSchema ? this._getRecordsToSave(records) : records;

    const updates = schemaModels.filter(rec => rec._key !== undefined && rec._key !== null);
    const adds = schemaModels.filter(rec => rec._key === undefined || rec._key === null);

    // get data content without the header row;
    const data = this._values().slice(1);

    updates.forEach(rec =>
      data.splice(rec._key - SheetDataAccess.ROW_INDEX_OFFSET, 1, this.headerRow.map(hdr => rec[hdr]))
    );
    data.push(...adds.map(rec => this.headerRow.map(hdr => rec[hdr])));

    const lock = LockService.getScriptLock();
    lock.tryLock(30 * 1000);

    if (!lock.hasLock())
      throw new Error('Could not perform batch operation, please try again!');

    this.wipe();

    this.sheet.getRange(2, 1, data.length, this.headerRow.length)
      .setValues(data);

    lock.releaseLock();

    this.clearCached();

    return this._getFromSchemaRecords(schemaModels);
  }

  /**
   * Performs a preflight validation of all records prior to saving
   *  This can be especially usefull with combined data actions that you want to be more transactional (all pass or all fail)
   * returns update/add methods prepared with the preflight records
   * Only allows a single call of a transaction method (will error if one is called again)
   * @param {Object | Object[]} records - records to prelight validate
   */
  preflight(records) {
    const arrayOfRecords = Array.isArray(records) ? records : [records];
    const recordsToSave = this._getRecordsToSave(arrayOfRecords);
    const bypassSchema = true;

    let transacted = false;
    const transact = (fn) => {
      if (transacted) throw new Error('Preflight transaction already complete!');
      fn();
      transacted = true;
    };

    return {
      addOne: () => transact(() => this.addOne(recordsToSave[0], { bypassSchema })),
      add: () => transact(() => this.add(recordsToSave, { bypassSchema })),
      update: () => transact(() => this.update(recordsToSave, { bypassSchema })),
      batch: () => transact(() => this.batch(recordsToSave, { bypassSchema })),
      upsert: () => transact(() => this.upsert(recordsToSave, { bypassSchema })),
      upsertOne: () => transact(() => this.upsertOne(recordsToSave[0], { bypassSchema })),
    };
  }

  /**
   * Clears all records from the sheet
   * @param {number} [rows] - optional number of rows to delete (all rows if left out)
   */
  wipe(rows) {
    const s = this.sheet;
    const rowsToWipe = rows !== undefined && rows >= 0 ? Math.min(rows, s.getMaxRows() - 1) : s.getMaxRows() - 1;
    if (rowsToWipe === 0)
      return;

    s.deleteRows(2, rowsToWipe);
    return this;
  }

  /**
   * Removes non-data rows
   */
  defrag() {
    const sheet = this.sheet;
    const data = this._values().filter(row => row[this._pkColumnIndex] !== '').slice(1);
    if (data.length === 0)
      return;

    const maxRow = sheet.getMaxRows();
    if (data.length + 1 === maxRow)
      return;

    this._init();

    const contentRange = sheet.getRange(2, 1, maxRow, sheet.getMaxColumns());
    contentRange.clear();

    sheet.getRange(2, 1, data.length, this.headerRow.length)
      .setValues(data);

    sheet.deleteRows(data.length + 2, maxRow - data.length);
    return this;
  }

  /**
   * Archives sheet to the given spreadsheet
   * @param {string} id - sheet it to archive to
   */
  archive(id) {
    const ss = SpreadsheetApp.openById(id);
    this.sheet.copyTo(ss);
    this.wipe();
    return this;
  }

  /**
   * Performs full text search
   * @param {Object} find - options
   */
  fts({ q, regex, matchCell, matchCase }) {
    const finder = this.sheet.createTextFinder(q);
    finder.useRegularExpression(!!regex);
    finder.matchEntireCell(!!matchCell);
    finder.matchCase(!!matchCase);

    const foundRows = finder.findAll().map(range => range.getRow()).filter(num => num !== 1);
    const data = this.data();
    return foundRows.map(num => data[num - SheetDataAccess.ROW_INDEX_OFFSET]);
  }

  /**
   * Sorts the source sheet data by column
   * @param {string} column - column name to sort
   * @param {boolean} [asc] - ascending order
   */
  sort(column, asc) {
    this._init();
    const headers = this.headerRow();
    const index = headers.findIndex(column);

    if (index !== -1) {
      this.sheet.sort(index + 1, !!asc);
      this.clearCached();
    }

    return this;
  }

  /**
   * Updates a range in the sheet datasource with the record data
   * @param {Object} record - record object
   * @param {Array} recordValues - record array values
   * @param {Number} columnCount - number of columns in range
   */
  _updateRow(record, recordValues, columnCount) {
    const range = this.sheet.getRange(record._key, 1, 1, columnCount);

    //last second check to make sure 2d array and sheet are still in sync for this object
    if (String(range.getValues()[0][this._pkColumnIndex]) !== String(recordValues[this._pkColumnIndex]))
      throw new Error(`Id at row ${record._key} does not match id of object for ${recordValues[this._pkColumnIndex]}`);

    range.setValues([recordValues]);
  }

  /**
   * Returns a usage report
   */
  inspect() {
    const sheet = this.sheet;
    const totalColumns = sheet.getMaxColumns();
    const totalRows = sheet.getMaxRows();
    const totalCells = totalColumns * totalRows;

    const report = {
      name: sheet.getName(),
      totalColumns,
      totalRows,
      totalCells,
      usagePercent: parseFloat((totalCells / SheetDataAccess.CELL_CAP).toFixed(2))
    };

    return report;
  }

}


/**
 * Helper methods for building objects that rely on environment configuration
 */
class CurrentEnvironment {

  /**
   * Single source method for defining the current environment configuration
   * - Change this here to define the environment of the app
   */
  static config() {
    /**
     * LEAVE THIS COMMENT BELOW! The AppsLibrary.cs ServerBuild relies on this template to build with the correct config
     */
    return ConfigurationFactory.developmentConfig();

    // return ConfigurationFactory.productionConfig();
    // return ConfigurationFactory.maintenanceConfig();
    return ConfigurationFactory.developmentConfig();
    // return ConfigurationFactory.localConfig();
  }

  /**
   * Helper method to return a SheetDataAccess object based on the current environment config
   * @returns {SheetDataAccessModel} SheetDataAccess object
   */
  static datasource() {
    const ds = new SheetDataAccess(
      { id: CurrentEnvironment.config().datasourceId },
      { schemas: DataModel.schema() }
    );
    return ds;
  }

  /**
   * Helper method to get a SystemLogger object based on config
   */
  static logger() {
    const { logger } = CurrentEnvironment.config();
    return AppsSystemLogger.create({
      sysid: logger.sysid,
      system: logger.system,
      env: logger.environment,
      activeLevel: logger.level,
      types: logger.types,
      defaultEmail: logger.email,
      apiId: logger.apiId,
      apiKey: logger.apiKey,
      folderId: logger.folderId,
    });

    //TODO: attach a different data logger?  So batch logs dont go to SystemLogger??
    //But we want other data logs to go to SystemLogger...
    // So we need batch logs that can be overridden...
  }

  /**
   * Gets the google drive folder for files
   */
  static filesFolder() {
    return DriveApp.getFolderById(CurrentEnvironment.config().filesFolderId)
  }

  /** poller */
  static poller() {
    const config = CurrentEnvironment.config();
    const isProd = config.environment === 'production';
    const cachePrefix = isProd ? '_prod' : '_dev';
    return AppsDataPoll.create({ logging: !isProd, cachePrefix, cacheSeconds: 60 * 30 });
  }

}

/**
 * Class that returns different environment configuration
 */
class ConfigurationFactory {

  /**
   * Gets the development environment configuration
   */
  static developmentConfig() {
    return {
      environment: 'development',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.VERBOSE,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

  /**
   * Gets the development environment configuration
   */
  static localConfig() {
    return {
      environment: 'development',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.VERBOSE,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

  /**
   * Maintenance config
   */
  static maintenanceConfig() {
    return {
      environment: 'maintenance'
    }
  }

  /**
   * Gets the production environment configuration
   */
  static productionConfig() {
    return {
      environment: 'production',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.INFO,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

}
class AppDataServices {

  /**
   * Gets the current environment and the current logged in users object from the datasource
   * @param {IUser} user 
   */
  static getAppInit(user) {
    const config = CurrentEnvironment.config();

    return {
      user,
      environment: config.environment
    };
  }

  /**
   * Gets all the models to return to the client
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static getAppData(ds) {
    const datasource = ds || CurrentEnvironment.datasource();
    const config = CurrentEnvironment.config();

    const models = AppDataServices.getAllModels(datasource);

    return {
      DataModel,
      config: {
        datasourceUrl: `https://docs.google.com/spreadsheets/d/${config.datasourceId}/edit`
      },
      lists: AppDataServices.getAppLists(models.users),
      models
    };
  }

  /**
   * Gets all of the individual models
   * @param {SheetDataAccessModel} datasource - datasource object
   */
  static getAllModels(datasource) {
    //keep other user settings private
    const users = AppDataServices.getUsers(datasource);

    const projects = datasource.collections.Project.data();
    const items = datasource.collections.Item.data();
    const comments = datasource.collections.Comment.data();
    const timelines = datasource.collections.Timeline.data();
    // const deployments = datasource.collections.Deployment.data();

    return {
      users,
      projects,
      items,
      comments,
      timelines,
      // deployments
    };

  }

  /**
   * Gets latest changed data
   * @param {string} from - time string
   * @param {string} by - user
   * @param {SheetDataAccessModel} [ds] - datasource object
   */
  static getLatestChanges(from, by, ds) {
    //keep other user settings private
    const datasource = ds || CurrentEnvironment.datasource();

    const projects = datasource.collections.Project.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const items = datasource.collections.Item.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const comments = datasource.collections.Comment.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const timelines = datasource.collections.Timeline.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    // const deployments = datasource.collections.Deployment.data();


    return {
      projects,
      items,
      comments,
      timelines,
      // deployments
    };
  }

  /**
   * Gets app lists
   * @param {IUser[]} users - list of users
   */
  static getAppLists(users) {
    const lists = {
      types: [
        'Feature',
        'Epic',
        'Story',
        'Bug',
        'Issue',
        'Enhancement',
        'Task',
        'Accessibility',
        'Planning',
        'Support'
      ],
      priorities: [
        'Low',
        'Medium',
        'High',
        'Critical'
      ],
      statuses: [
        'New',
        'Open',
        'Hold',
        'Testing',
        'Closed'
      ],
      themes: [
        'Dark',
        'Light',
        'Red',
        'Blue'
      ],
      projectStatuses: [
        'Backlog',
        'Planning',
        'Development',
        'System testing',
        'UAT',
        'Stable',
        'Inactive'
      ],
      projectPrograms: [
        'All'
      ],
      accessibilityStatuses: [
        'N/A',
        'Planning',
        'Remediation',
        'Maintenance',
        'Resolved'
      ],
      timelineStatuses: [
        'Open',
        'Closed'
      ],
      timelineEfforts: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      timelinePriorities: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      timelineMagnitudes: [
        1,
        2,
        3,
        4,
        5
      ],
      users: users.filter(u => u.role !== 'service').map(u => u.email).sort()
    };

    return lists;
  }

  /**
   * Gets all users
   * @param {SheetDataAccessModel} datasource - datasource object 
   */
  static getUsers(datasource) {
    return datasource.collections.User.data()
      .map(user => ({
        _key: user._key,
        id: user.id,
        email: user.email,
        role: user.role,
      })).sort((a, b) => (
        a.email < b.email ? -1 : 1)
      );
  }

}
class CommentServices {

  /**
   * Saves comment to datasource
   * @param {IComment} comment - comment to save
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveComment(comment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const item = datasource.collections.Item.data()
      .find(itm => itm.id === comment.item);

    if (!item)
      throw new ApiError(`Item with id ${comment.item} not found!`, { code: 404 });

    //save item to update metadata
    const [savedItem] = datasource.collections.Item.update([item]);

    const savedComment = datasource.collections.Comment.upsertOne(comment);

    return {
      comment: savedComment,
      item: savedItem
    };
  }

  /**
   * Requests to delete an existing comment in the datasource
   * @param {IComment} comment - object containing all properties of a Comment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteComment(comment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    datasource.collections.Comment.delete([comment]);

    return null;
  }

  /**
   * Checks a comment text for tagged emails (ie @email@whatever.com)
   * @param {string} comment - comment string to check for tagged emails
   */
  static getValidCommetTaggedEmails(commentText) {
    //validate if comment contains emails to send
    const pattern = /@[^\s]+(@.*)/g;
    const matches = commentText.match(pattern);

    if (!matches)
      return [];

    const validEmails = matches.map(email => {
      const emailWithoutTag = email.slice(1);
      const contacts = ContactsApp.getContactsByEmailAddress(emailWithoutTag);

      if (contacts.length === 0)
        return null;

      return emailWithoutTag;
    }).filter(email => email !== null);

    return validEmails;
  }

  /**
   * Emails a comment to the defined emails...
   * @param {IComment} comment - comment
   * @param {SheetDataAccessModel} datasource - data access object
   */
  static emailComment(comment, datasource) {

    //eat errors so emailing doesnt break any outside functionality
    try {

      const validEmails = CommentServices.getValidCommetTaggedEmails(comment.comment);

      if (validEmails.length === 0)
        return;

      const item = datasource.collections.item.find({
        where: 'id',
        is: comment.item
      });
      const project = datasource.collections.project.find({
        where: 'id',
        is: item.project
      });

      const config = CurrentEnvironment.config();
      const itemUrl = `${config.appUrl}?itemId=${item.id}`;

      const template = HtmlService.createTemplate(`
      <p style="font-size: 1.2rem; margin-bottom: .25rem;">Information Services project '<?= project.name ?>'</p>
      <br>
      <p>A new comment has been added to the work item '<?= item.name ?>'</p>
      <br>
      <div style="padding=.2rem; border: 1px solid black">
        <p>Comment:</p>
        <p> - <?= comment.comment ?></p>
      </div>
      <br>
      <a href="<?= itemUrl ?>">Open this item in the Information Services projects app</a>
    `);
      template.item = item;
      template.project = project;
      template.comment = comment;
      template.itemUrl = itemUrl;

      const htmlBody = template.evaluate().getContent();

      MailApp.sendEmail({
        to: validEmails.join(','),
        subject: `Information Services work item comment - ${(new Date()).toJSON()}`,
        htmlBody: htmlBody
      });

    } catch (error) {
      console.log(error);
    }

  }

}
class DeploymentServices {
  /**
   * Requests to create a new deployment in the datasource
   * @param {IDeployment} deployment - object containing all properties of a Deployment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveDeployment(deployment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedDeployment = datasource.collections.Deployment.upsertOne(deployment);

    return savedDeployment;
  }

  /**
   * Requests to delete an existing deployment in the datasource
   * @param {IDeployment} deployment - object containing all properties of the existing Deployment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteDeployment(deployment, user, { force = false } = {}, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Deployment.data()
      .find(dep => dep.id === deployment.id);

    if (!existing)
      return null;

    if (existing.owner !== user.email && !force)
      throw new ApiError('Not authorized to delete this deployment!', { code: 403 });

    datasource.collections.Deployment.delete([deployment]);

    return null;
  }
}
class IntegrationServices {

  /**
   * Sends an email for a given item
   * @param {IItem} item - item object to send email for
   * @param {{ to: string, cc: string, message: string, noReply: boolean }} emailMessage - object defining the properties of the message to send (To, Cc, Message)
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static sendItemEmail({ item, emailMessage }, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const {
      message,
      to,
      cc,
      noReply
    } = emailMessage;

    const project = datasource.collections.Project.data()
      .find(project => project.id === item.project);

    const config = CurrentEnvironment.config();
    const itemUrl = `${config.appUrl}/item/${item.id}`;

    const template = HtmlService.createTemplate(`
    <p style="font-size: 1.2rem; margin-bottom: .25rem;">Information Services project: '<?= project.name ?>'</p>
    <p>Work item notification: '[<?= item.itemNumber ?>] - <?= item.name ?>'</p>
    <hr>
    <p>Message:</p>
    <p><?= message ?></p>
    <br>
    <a href="<?= itemUrl ?>">Open this item in the Information Services-Projects app</a>
  `);
    template.project = project;
    template.item = item;
    template.message = message;
    template.itemUrl = itemUrl;

    const htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({
      to,
      cc,
      noReply,
      subject: `Information Services item [${item.itemNumber}] - ${(new Date()).toJSON()}`,
      htmlBody
    });

    return null;
  }

  /**
   * Creates an item calendar event
   * @param {IItem} item - item to create even
   * @param {string} startTimeString - [YYYY-MM-ddThh:mm:ss] time to start event
   */
  static createItemCalendarEvent({ item, startTimeString }) {
    const start = new Date(startTimeString);

    if (Number.isNaN(start.getDate()))
      throw new ApiError(`${startTimeString} is not a valid date string!`, { code: 400 });

    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const event = {
      summary: `[${item.itemNumber}] - ${item.name}`,
      description: item.description || '',
      start: {
        dateTime: start.toISOString()
      },
      end: {
        dateTime: end.toISOString()
      },
      colorId: CalendarApp.EventColor.MAUVE,
      transparency: 'transparent'
    };

    const response = Calendar.Events.insert(event, 'primary');

    return response;
  }

}
class ItemServices {

  /**
   * Requests to create a new item in the datasource
   * @param {IItem} item - object containing all properties of a item
   * @param {IUser} user - object containing all properties of a item
   * @param {{ ds: SheetDataAccessModel, quiet: boolean }} [options] - options
   */
  static saveItem(item, user, { ds, quiet } = {}) {
    const datasource = ds || CurrentEnvironment.datasource();

    const changeEvent = ItemServices.onItemSave(item, user, datasource, { quiet });
    const savedItem = datasource.collections.Item.upsertOne(item);

    if (changeEvent)
      changeEvent(savedItem);

    return savedItem;
  }

  /**
   * Requests to delete an existing item in the datasource
   * @param {IItem} item - object containing all properties of an Item
   * @param {IUser} user - user
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteItem(item, user, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Item.data()
      .find(itm => itm.id === item.id);

    if (!existing)
      return null;

    if (existing.createdBy !== user.email && existing.asignee !== user.email)
      throw new ApiError('Not authorized to delete this item!', { code: 403 });

    datasource.collections.Item.delete([item]);

    return null;
  }

  /**
   * creates a new file in Google Drive for the provided blob
   * @param {object} file - object containing file info to create
   * @param {string} file.data - base 64 encoded file data
   * @param {string} file.type - mime type
   * @param {string} file.name - file name
   */
  static createItemFile({ data, type, name }) {
    const decoded = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decoded, type, name);

    const files = DriveFileSystem.dfs({ dir: CurrentEnvironment.filesFolder() });

    const file = files.file.create({ path: '/' }, { blob });

    return files.file.inspect({ src: file });
  }

  /**
   * Gets the Drive file details by url
   * @param {object} options - options
   * @param {string} [options.id] - optional id of file details to get
   * @param {string} [options.url] - optional url of file details to get
   */
  static getDriveFileDetails({ id, url }) {
    const dfs = DriveFileSystem.dfs();
    const file = dfs.file.get({ id, url });
    if (!file)
      throw new ApiError(`Could not find file with resource ${url || id}`, { code: 404 });
    return dfs.file.inspect({ src: file });
  }

  // /** DEPRECATED
  //  * deletes a file in Google Drive by the provided id
  //  * @param {string} fileId - Drive id of the file to delete
  //  */
  // static deleteItemFile(fileId) {
  //   const config = CurrentEnvironment.config();
  //   const dfs = DriveFileSystem.dfs();
  //   const file = dfs.file.get({ id: fileId });

  //   const [parent] = dfs.file.parents({ src: file });
  //   if (parent && parent.getId() === config.filesFolderId)
  //     dfs.file.remove({ src: file });

  //   return dfs.file.inspect({ src: file });
  // }

  /**
   * Event handler for item save
   * @param {IItem} item 
   * @param {SheetDataAccessModel} datasource - datasource object
   * @param {object} [options] - options
   * @param {boolean} [options.quiet] - do not send notifications
   */
  static onItemSave(item, user, datasource, { quiet } = {}) {

    const config = CurrentEnvironment.config();
    const isProd = config.environment === 'production';

    if (!!quiet || item.assignee === user.email)
      return null;

    const assignee = datasource.collections.User.data()
      .find(usr => usr.email === item.assignee);

    if (assignee && assignee.settings.getItemEmailNotifications) {
      const existing = datasource.collections.Item.find(item._key);

      if (isProd && (!existing || existing.assignee !== item.assignee))
        return (savedItemState) => IntegrationServices.sendItemEmail({
          item: savedItemState,
          emailMessage: {
            to: assignee.email,
            message: `This item has been assigned to ${assignee.email}!`
          }
        }, datasource);
    }

    return null;
  }

}
class MaintenanceServices {

  /**
   * Defrag datasource (designed as an overnight scheduled process, maybe once a month or so...)
   */
  static defragDatasource() {
    const datasource = CurrentEnvironment.datasource();

    console.time('defrag');
    datasource.collections.Item.defrag();
    datasource.collections.Project.defrag();
    datasource.collections.Comment.defrag();
    console.timeEnd('defrag');

    return { message: 'Defrag success!' };
  }

}
class ProjectServices {

  /**
   * Requests to create a new project in the datasource
   * @param {IProject} project - object containing all properties of a Project
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveProject(project, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedProject = datasource.collections.Project.upsertOne(project);

    return savedProject;
  }

  /**
   * Requests to delete an existing project in the datasource
   * @param {IProject} project - object containing all properties of the existing Project
   * @param {IUser} user - user object
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteProject(project, user, { cascade = false, force = false } = {}, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Project.data()
      .find(proj => proj.id === project.id);

    if (!existing)
      return null;

    if (existing.owner !== user.email && !force)
      throw new ApiError('Not authorized to delete this project!', { code: 403 });

    datasource.collections.Project.delete([project]);

    if (cascade) {
      const items = datasource.collections.Item.data()
        .filter(itm => itm.project === project.id);
      const comments = datasource.collections.Comment.data()
        .filter(cmt => items.some(itm => itm.id === cmt.item));

      datasource.collections.Item.delete(items);
      datasource.collections.Comment.delete(comments);
    }

    return null;
  }

  /**
   * Updates all outstanding items for a project to a new version
   * @param {IProject} project - project with the desired new version set as the version prop
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static updateOutstandingItemsVersion(project, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const items = datasource.collections.Item.data()
      .filter(item => item.project === project.id && item.status !== 'Closed');

    const itemsToUpdate = items.map(item => {
      item.version = project.version;
      return item;
    });

    const savedItems = datasource.collections.Item.update(itemsToUpdate);

    return savedItems;
  }

  /**
   * Creates a new template PRD (defaults to users 'My Drive')
   * @param {Object} [options] - options
   * @param {GoogleAppsScript.Drive.Folder} [options.folder] - folder
   * @param {String} [options.folderId] - folder id
   * @param {String} [options.name] - optional file name
   */
  static createTemplatePrd({ folder, folderId, name } = {}) {
    const config = CurrentEnvironment.config();
    const dfs = DriveFileSystem.dfs();

    const destination = {
      path: (!folder && !folderId) ? '/' : undefined,
      id: folderId,
      src: folder
    };
    const prd = dfs.file.copy({ id: config.templatePrdId }, destination, name);

    return dfs.file.inspect({ src: prd });
  }

}
class QueryServices {

  static getWebRequestsWithFiles() {
    const ds = CurrentEnvironment.datasource();

    const items = ds.collections.Item.data()
      .filter(itm => itm.project === '4e68ae84-a9ce-4aa3-9266-5df2ee698349');

    const cindex = ds.collections.Comment.index('item');

    const adt = AppsDateTime.adt();
    const start = adt.build({ year: 2024, month: 1, day: 1 });
    const end = adt.build({ year: 2024, month: 3, day: 26 });

    let count = 0;
    let fileCount = 0;

    const docRequests = items.filter(itm => {
      const cmt = cindex[itm.id];
      const created = new Date(itm.createdDate);

      if (!cmt) return false;
      if (created <= start || created >= end) return false;

      const files = itm.files;

      const records = [...cmt.comment.matchAll(/Please upload the document for this record/g)];
      const handles = [...cmt.comment.matchAll(/OnBase Document Handle:/g)];

      const docsRequested = records.length + (handles.length * 1.5);

      count += docsRequested;
      fileCount += files.length;

      return files.length > 0 || docsRequested > 0;
    });

    console.log(count);
    console.log(fileCount);
    console.log(count + fileCount);
  }

}
class ScheduledServices {

  /**
   * Sweeps batch logs
   */
  static sweepBatchLogs() {
    const logger = CurrentEnvironment.logger();
    logger.batch.sweep();
  }

  /**
   * defrags datasource
   */
  static defragDatasource() {
    const response = JSON.parse(api({
      method: 'post',
      route: '/auth/ds/maintenance/defrag'
    }));

    if (response.status !== 200)
      throw new Error(response.body.message);
  }

}

/**
 * Public function for scheduling log sweep
 */
function timedSweepBatchLogs() {
  ScheduledServices.sweepBatchLogs();
}

/**
 * Public function that can be hooked into a timed event
 */
function defragDatasource() {
  ScheduledServices.defragDatasource();
}
class SecurityServices {

  /**
   * throws error if user not in datasource
   * @param {SheetDataAccessModel} datasource - datasource object to lookup user
   * @param {Object} options - options for further checks
   */
  static checkIfValidUser(datasource, options = {}) {
    const user = SecurityServices.getCurrentUserObject(datasource);

    if (!user || user.deleted)
      throw new ApiError('Not authorized', { code: 403 });

    //get options
    const {
      roles
    } = options;

    //check if roles in the options and validate
    if (roles && !roles.includes(user.role))
      throw new ApiError('Not authorized: role', { code: 403 });

    return user;

  }

  /**
   * Gets the crrent user object from the datasource
   * @param {SheetDataAccessModel} [datasource] - datasource to lookup
   */
  static getCurrentUserObject(datasource) {
    const ds = datasource || CurrentEnvironment.datasource();
    const userEmail = Session.getActiveUser().getEmail();

    const user = ds.collections.User.data()
      .find(user => user.email === userEmail);

    return user;
  }

  /**
   * forces https: protocal to prevent javascript injection
   * @param {string} url - url to sanitize
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== 'string')
      return '';

    const httpsProtocol = /^(https:\/\/)/i;
    if (httpsProtocol.test(url))
      return url
    else
      return '';
  }
}
class TimelineServices {

  /**
   * Requests to create a new timeline in the datasource
   * @param {ITimeline} timeline - object containing all properties of a Timeline
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveTimeline(timeline, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedTimeline = datasource.collections.Timeline.upsertOne(timeline);

    return savedTimeline;
  }

  /**
   * Requests to delete an existing timeline in the datasource
   * @param {ITimeline} timeline - object containing all properties of an Timeline
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteTimeline(timeline, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Timeline.data()
      .find(ms => ms.id === timeline.id);

    if (!existing)
      return null;

    datasource.collections.Timeline.delete([timeline]);

    return null;
  }

}
class UserServices {

  /**
   * Updates a user to the datasource
   * @param {IUser} user - user to update
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveUser(user, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const [savedUser] = datasource.collections.User.update([user]);

    return savedUser;
  }

}

class AppsProjects {

  static server() {
    const config = CurrentEnvironment.config();
    const debug = config.environment !== 'production';
    const maintenance = config.environment === 'maintenance';

    const server = AppsServer.create({
      debug
    });

    // -------------------------------------------------------
    // |                    MIDDLEWARE                       |
    // -------------------------------------------------------

    if (maintenance) {
      // if maintenace, only register one catchall middleware
      server.use('/.*', (req, res, next) => {

        if (req.route === '/auth/ds/index.html') {
          const viewport = 'width=device-width, initial-scale=1';
          const themeFile = `bulma-themes/bulma-light`;

          res.status(server.STATUS_CODE.SUCCESS)
            .render({ file: 'client/maintenance.html' }, {
              bulmaThemeCss: HtmlService.createHtmlOutputFromFile(themeFile).getContent()
            }).body.setTitle('AP under maintenance')
            .addMetaTag('viewport', viewport);
        } else {
          res.status(server.STATUS_CODE.FORBIDDEN)
            .send({ message: 'AP is under maintenance, try again later.' });

        }
      });

      return server;
    }

    server.use('/.*', (req, res, next) => {
      const start = Date.now();
      next();
      const end = Date.now();
      res.headers({ 'ap-response-time': end - start });
    });

    server.use('/.*', (req, res, next) => {
      console.log(`Request to: ${req.route} at ${new Date()}`);
      if (debug)
        console.log(req);
      next();
      console.log(res);
    });

    server.use('.*/ds/.*', (req, res, next) => {
      res.locals.datasource = CurrentEnvironment.datasource();
      next();
    });

    server.use('.*/auth/.*', (req, res, next) => {
      const datasource = res.locals.datasource || CurrentEnvironment.datasource();
      const user = datasource.collections.User.data()
        .find(u => u.email === req.by);

      if (user) {
        req.auth.user = user;
        next();
      } else {
        res.status(server.STATUS_CODE.FORBIDDEN).send({ message: 'Not authorized' });
      }

    });

    // const serverpoll = (req, res, next) => {
    //   next();
    //   if (res.isSuccess()) {
    //     const poller = CurrentEnvironment.poller();
    //     poller.cache.set(req.by);
    //   }
    // };

    const serverpollCache = (session, updates) => {
      // const poller = CurrentEnvironment.poller();
      
      // HOTFIX DISABLE SERVER POLL LOGGING
      // const logger = CurrentEnvironment.logger();
      // logger.info.batch({ message: `${session}-session server poll cached (${updates.length}) updates`, json: updates });

      // poller.cache.set({ session, records: updates });
    };

    // -------------------------------------------------------
    // |                      INDEX                          |
    // -------------------------------------------------------

    server.get('/auth/ds/index.html', (req, res) => {
      const user = req.auth.user;

      const title = `${config.environment === 'development' ? 'Dev - ' : ''}Information Services Projects`;
      const viewport = 'width=device-width, initial-scale=1';

      if (user) {

        const theme = user.settings.theme || "Light";
        const themeFile = `bulma-themes/bulma-${theme.toLowerCase()}`;

        const datasource = res.locals.datasource || CurrentEnvironment.datasource();
        const appDataConfig = datasource.collections.Config.data().find(c => c.id === 'app');

        res.status(server.STATUS_CODE.SUCCESS)
          .render({ file: 'client/index.html' }, {
            bulmaThemeCss: HtmlService.createHtmlOutputFromFile(themeFile).getContent(),
            themeVariableClass: `${theme.toLowerCase()}-theme`,
            environment: config.environment,
            session: Utilities.getUuid(),
            dataPolling: appDataConfig.json.dataPolling || {},
            userjson: JSON.stringify(user)
          }).body.setTitle(title)
          .setFaviconUrl(config.faviconUrl)
          .addMetaTag('viewport', viewport);

      } else {

        res.status(server.STATUS_CODE.SUCCESS)
          .render({
            html: `
            <div style="margin-top: 2rem;">
              <h1>Cannot log you in!</h1>
            <div>
            <script>google = {};</script>`
          }).body.setTitle(title)
          .addMetaTag('viewport', viewport);

      }
    });

    // -------------------------------------------------------
    // |                     APP DATA                        |
    // -------------------------------------------------------

    server.get('/auth/app-init', (req, res) => {
      const data = AppDataServices.getAppInit(req.auth.user);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data', (req, res) => {
      const { session } = req.params;

      const poller = CurrentEnvironment.poller();
      poller.cache.sessionInfo.set(session, { ts: Date.now() });

      const data = AppDataServices.getAppData(res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data/latest', (req, res) => {
      const { start = new Date().toJSON() } = req.params;

      const data = AppDataServices.getLatestChanges(start, req.by, res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-lists', (req, res) => {
      const data = AppDataServices.getAppLists(res.locals.datasource.collections.User.data());
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/projects', (req, res) => {
      const data = res.locals.datasource.collections.Project.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/items', (req, res) => {
      const data = res.locals.datasource.collections.Item.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/comments', (req, res) => {
      const data = res.locals.datasource.collections.Comment.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/timelines', (req, res) => {
      const data = res.locals.datasource.collections.Timeline.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data-poll', (req, res) => {
      const { lastSuccess } = req.body;
      const { session } = req.params;

      const poller = CurrentEnvironment.poller();
      const data = poller.poll(session, lastSuccess)
        ? AppDataServices.getAppData(res.locals.datasource)
        : null;

      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/long-poll', (req, res) => {
      const { session } = req.params;

      const logger = CurrentEnvironment.logger();
      logger.info.batch({ message: `${session}-session server long polling start` });

      const poller = CurrentEnvironment.poller();

      let incrementals, all;
      if (poller.cache.sessionInfo.stale(session)) {
        poller.cache.sessionInfo.set(session, { ts: Date.now() });
        all = AppDataServices.getAppData();
      } else {
        incrementals = poller.longPoll(session);
      }

      if (incrementals && incrementals.length > 0) {
        logger.info.batch({ message: `${session}-session server long polling (${incrementals.length}) updates found`, json: incrementals });
      } else if (incrementals) {
        logger.info.batch({ message: `${session}-session server long polling empty` });
      } else {
        logger.info.batch({ message: `${session}-session server long polling all data refresh` });
      }

      res.status(server.STATUS_CODE.SUCCESS).send({ incrementals, all });
    });

    server.post('/auth/ds/cancel-poll', (req, res) => {
      const { session } = req.params;

      const logger = CurrentEnvironment.logger();
      logger.info.batch({ message: `${session}-session server long polling session cancel` });

      const poller = CurrentEnvironment.poller();
      poller.cancel(session);

      res.status(server.STATUS_CODE.SUCCESS).send();
    });

    // -------------------------------------------------------
    // |                      PROJECT                        |
    // -------------------------------------------------------

    server.post('/auth/ds/project/save', (req, res) => {
      const saved = ProjectServices.saveProject(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Project', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.post('/auth/ds/project/update-items-version', (req, res) => {
      const items = ProjectServices.updateOutstandingItemsVersion(req.body, res.locals.datasource);

      serverpollCache(req.params.session, items.map(item => ({ model: 'Item', record: item, id: item.id })));
      res.status(server.STATUS_CODE.SUCCESS).send(items);
    });

    server.delete('/auth/ds/project/delete', (req, res) => {
      const project = req.body;
      ProjectServices.deleteProject(project, req.auth.user, req.params, res.locals.datasource)

      serverpollCache(req.params.session, [{ model: 'Project', record: project, id: project.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                      PROJECT                        |
    // -------------------------------------------------------

    server.post('/auth/ds/deployment/save', (req, res) => {
      const saved = DeploymentServices.saveDeployment(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Deployment', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/deployment/delete', (req, res) => {
      const deployment = req.body;
      DeploymentServices.deleteDeployment(deployment, req.auth.user, req.params, res.locals.datasource)

      serverpollCache(req.params.session, [{ model: 'Deployment', record: deployment, id: deployment.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                       ITEM                          |
    // -------------------------------------------------------

    server.post('/auth/ds/item/save', (req, res) => {
      const saved = ItemServices.saveItem(req.body, req.auth.user, { ds: res.locals.datasource });

      serverpollCache(req.params.session, [{ model: 'Item', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    const handleItemPost = ({ item, comments, user, quiet }, datasource) => {
      const project = datasource.collections.Project.data()
        .find(proj => proj.id === item.project);

      if (!project)
        throw new ApiError(`Project ${item.project} not found!`, { code: 404 });

      //defaults
      item.type = item.type || 'Task';
      item.priority = item.priority || 'Medium';
      item.status = item.status || 'New';
      item.version = item.version || project.version;

      const saved = ItemServices.saveItem(item, user, { ds: datasource, quiet });
      /** @type {{ item: IItem, comments: IComment[] }} */
      const response = {
        item: saved,
        comments: []
      };

      if (comments && comments.length > 0)
        response.comments = comments.map(comment => {
          comment.item = saved.id;
          const saveResponse = CommentServices.saveComment(comment, datasource);
          return saveResponse.comment;
        });

      return response;
    }

    server.post('/auth/ds/item/post', (req, res) => {
      const { quiet } = req.params;
      const { item } = handleItemPost({ item: req.body, user: req.auth.user, quiet: !!quiet }, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(item);
    });

    server.post('/auth/ds/item/post-with-comments', (req, res) => {
      const { item, comments } = handleItemPost({
        item: req.body.item,
        comments: req.body.comments,
        user: req.auth.user,
        quiet: !!req.params.quiet
      }, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id }, ...comments.map(c => ({ model: 'Comment', record: c, id: c.id }))]);
      res.status(server.STATUS_CODE.SUCCESS).send({ item, comments });
    });

    server.delete('/auth/ds/item/delete', (req, res) => {
      const item = req.body;
      ItemServices.deleteItem(item, req.auth.user, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/email', (req, res) => {
      ItemServices.sendItemEmail(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/calendar-event', (req, res) => {
      const event = IntegrationServices.createItemCalendarEvent(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(event);
    });

    server.post('/auth/file/create', (req, res) => {
      const info = ItemServices.createItemFile(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    // DEPRECATED, no longer deleting files, just references
    // server.delete('/auth/file/delete', (req, res) => {
    //   const trashed = ItemServices.deleteItemFile(req.body);
    //   res.status(server.STATUS_CODE.SUCCESS).send(trashed);
    // });

    server.post('/auth/file/drive/details', (req, res) => {
      const { url, id } = req.body;
      const info = ItemServices.getDriveFileDetails({ url, id });
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    // -------------------------------------------------------
    // |                     TIMELINE                        |
    // -------------------------------------------------------

    server.post('/auth/ds/timeline/save', (req, res) => {
      const saved = TimelineServices.saveTimeline(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Timeline', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/timeline/delete', (req, res) => {
      const timeline = req.body;
      TimelineServices.deleteTimeline(timeline, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Timeline', record: timeline, id: timeline.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                     COMMENT                         |
    // -------------------------------------------------------

    server.post('/auth/ds/comment/save', (req, res) => {
      const saved = CommentServices.saveComment(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Comment', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/comment/delete', (req, res) => {
      const comment = req.body;
      CommentServices.deleteComment(comment, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Comment', record: comment, id: comment.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                        UTIL                         |
    // -------------------------------------------------------

    server.post('/auth/ds/files/create-prd', (req, res) => {
      const { type, name } = (req.body || {});

      const config = CurrentEnvironment.config();
      const folderId = type === 'item-attachment' ? config.filesFolderId : undefined;
      const info = ProjectServices.createTemplatePrd({ folderId, name });
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    server.post('/auth/ds/user/save', (req, res) => {
      const user = req.body;

      if (req.auth.user.id !== user.id)
        throw new ApiError('Not authorized to edit another user!', { code: 403 });

      const saved = UserServices.saveUser(user, res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.post('/auth/ds/maintenance/defrag', (req, res) => {
      // if (req.by !== '')
      //   throw new ApiError('Not authorized to run maintenance/defrag', { code: 401 });

      const result = MaintenanceServices.defragDatasource();
      res.status(server.STATUS_CODE.SUCCESS).send(result);
    });

    // -------------------------------------------------------
    // |               APPS DRIVE PICKER                     |
    // -------------------------------------------------------

    // NOT IN USE!
    // server.use('/.*', AppsDrivePicker.middleware);
    // AppsDrivePicker.use(server);

    // -------------------------------------------------------
    // |                      ERROR                          |
    // -------------------------------------------------------

    if (config.environment === 'production')
      server.error((err, req) => {
        const logger = CurrentEnvironment.logger();
        logger.error.data({ message: err.message, json: { route: req.rawRoute, stack: err.stack } });
      });

    return server;
  }

}

/**
 * Main client entry point for requests
 * @param {AppsRequest} req - request object
 */
function api(req) {
  return AppsProjects.server().handleClientRequest(req);
}

/**
 * Handles get requests
 * @param {Object} event - Apps script GET event parameter
 * @returns {HTMLOutput} Evaluated HTML output of the primary index.html file
 */
function doGet(event = {}) {
  return AppsProjects.server().handleDoGet(event, { homeroute: '/auth/ds/index.html' });
}

/**
 * Handles post requests
 * @param {Object} event - post event
 */
function doPost(event = {}) {
  return AppsProjects.server().handleDoPost(event);
}
