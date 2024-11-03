/**
 * Dispatch definition
 */
const utilDispatch = () => {

  return {

    /**
     * Creates new prd template
     * @param {Object} [options]
     */
    async createPrdTemplate({ type, name } = {}) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post('/auth/ds/files/create-prd').send({ type, name });

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    // /**
    //  * Parses current route query params for filter fields
    //  * @returns {Object} criteria
    //  */
    // parseFilterParametersToCriteria(defaultCriteria = { search: '', sort: {}, filter: {} }) {
    //   const {
    //     state,
    //   } = store;

    //   const params = state.app.currentQueryParams;

    //   const copy = {
    //     ...params
    //   };

    //   const {
    //     sort = defaultCriteria.sort.header || "",
    //     asc = defaultCriteria.sort.ascending ? "true" : "false",
    //     search = defaultCriteria.search || ""
    //   } = copy;

    //   delete copy.sort;
    //   delete copy.asc;
    //   delete copy.search;

    //   const queryCriteria = {
    //     sort: {
    //       header: sort,
    //       ascending: asc === "true"
    //     },
    //     search,
    //     filter: defaultCriteria.filter
    //   };

    //   Object.keys(copy).forEach(param => queryCriteria.filter[param] = copy[param]);

    //   return queryCriteria;

    // },

    // /**
    //  * Parses a given criteria object to a set of query params
    //  * @returns {Object} query params
    //  */
    // parseCriteriaToQueryParams(crit) {
    //   const query = Object.keys(crit.filter)
    //     .filter(key => crit.filter[key] !== "")
    //     .reduce((obj, key) => {
    //       obj[key] = crit.filter[key];
    //       return obj;
    //     }, {});

    //   query.sort = crit.sort.header;
    //   query.asc = crit.sort.ascending;
    //   if (crit.search !== "")
    //     query.search = crit.search;

    //   return query;
    // },

    /**
     * Helper to download a give set of data as csv
     * @param {string} fileName - file name
     * @param {Object[]} data - data to download
     */
    downloadDataAsCsv(fileName, data) {
      
      const headers = Object.keys(data[0]).map(key => `"${key.replace(/"/gs, "'")}"`).join(',');
      const rows = data.map(row =>
        Object.values(row).map(val => {
          if (typeof val === 'string')
            return `"${val.replace(/(\r\n|\r|\n)/gs, ' | ').replace(/"/gs, "'")}"`;
          return `"${val}"`;
        }).join(',')
      )
        .join('\r\n');
    
      const csv = headers
        + '\r\n'
        + rows;

      const a = document.createElement('a');
      a.setAttribute(
        'href',
        'data:application/octet-stream;charset=utf-8,'
        + encodeURIComponent(csv)
      );
      a.setAttribute('download', fileName);
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

  };
};