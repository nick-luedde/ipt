class MockApiError extends Error {
  constructor(message, { code = 400 } = {}) {
    super(message);
    this.code = code;
  }
}

class MockAppsServer {

  /**
   * @param {*} options 
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

        res.status = STATUS_CODE.SUCCESS;
        res.type = MIME_TYPES.HTML;
        res.body = html || file;

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
        req.by = 'Me';
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
      handleClientRequest
    };
  }

}