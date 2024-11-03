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