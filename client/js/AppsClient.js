/**
 * Request type definition
 * @typedef {Object} AppsRequest
 * @property {string} method - request method ('get', 'post', 'delete')
 * @property {Object} headers - key value headers
 * @property {string} route - requested route
 * @property {Object} params - request parameters
 * @property {Object} body - request body
 */

/**
 * Response type definition
 * @typedef {Object} AppsResponse
 * @property {number} status - http status code
 * @property {string} type - http mime type
 * @property {Object} headers - key value headers
 * @property {Object} body - request body
 */

/**
 * App client to server api handler
 * @param {Object} [options] - optional options
 * @param {Function} [options.errorHandler] - optional error handler function for all requests
 * @param {string} [options.env] - optional environment
 */
const AppsClient = (options = {}) => {
  //TODO: options?

  const errorHandler = options.errorHandler && typeof options.errorHandler === 'function'
    ? options.errorHandler
    : () => { };

  const env = options.env || 'development'

  const STATUS_CODE = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  };

  const MIME_TYPES = {
    JSON: 'application/json',
    HTML: 'text/html'
  };

  const request = (route) => {
    const req = {
      route,
      method: '',
      headers: {},
      body: null
    };

    /**
     * Sends request to server api
     * @param {any} body 
     * @returns {Promise<AppsResponse>}
     */
    const send = (body) => new Promise((resolve, reject) => {
      req.body = body || null;

      if (env !== 'production')
        console.log('AppsClient.send', req);

      google.script.run
        .withSuccessHandler(res => {
          res = JSON.parse(res);

          if (env !== 'production')
            console.log('AppsClient response', res);

          if ([
            STATUS_CODE.BAD_REQUEST,
            STATUS_CODE.FORBIDDEN,
            STATUS_CODE.NOT_FOUND,
            STATUS_CODE.SERVER_ERROR
          ].includes(res.status)) {
            const err = new Error(res.body.message);
            err.name = res.body.name || 'Error';
            err.stack = res.body.stack;

            errorHandler(err);
            reject(err);
          }
          else
            resolve(res);
        })
        .withFailureHandler(error => {
          errorHandler(error);
          reject(error);
        })
        .api(req);
    });

    const headers = (hdrs) => {
      req.headers = {
        ...req.headers,
        ...hdrs
      };

      return api;
    };

    const method = (mthd) => {
      req.method = mthd;
      return api;
    }

    const api = {
      method,
      headers,
      send
    };

    return api;
  };

  const get = (route) => {
    const req = request(route);
    req.method('get');

    return req;
  };

  const post = (route) => {
    const req = request(route);
    req.method('post');

    return req;
  };

  const del = (route) => {
    const req = request(route);
    req.method('delete');

    return req;
  };

  return {
    get,
    post,
    delete: del
  };
};