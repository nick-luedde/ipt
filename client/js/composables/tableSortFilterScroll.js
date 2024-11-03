/**
 * @typedef {Object} VueTableFilter
 * @property {Object.<String[]>}
 */

/**
 * @typedef {Object} VueTableSort
 * @property {string} header - header sorted
 * @property {boolean} ascending - if sort is asc direction
 */

/**
 * @typedef {Object} VueTableSortFilterCriteria
 * @property {string} search - search text
 * @property {VueTableFilter} filter - filter by custom props
 * @property {Object} dates - filter by dates
 * @property {VueTableSort} sort - sort by header
 */

/**
 * @typedef {Object} VueTableFilterField
 * @property {string} prop - property to filter
 * @property {Object[]} options - filter options
 * @property {Object} options[].value - filter option value
 * @property {Object} options[].text - filter option display text
 */

/**
 * @typedef {Object} VueTableFilterDate
 * @property {string} prop - date prop name
 * @property {string} start - filter start
 * @property {string} end - filter end
 */

const useTableSortFilterScroll = (context, {
  rows,
  headers,
  criteria,
  filterFields,
  filterDates,
  observeScrolling = true,
  syncUrlQuery = true,
  useWorker = false,
} = {}) => {
  // 'imports' from Vue
  const {
    computed,
    ref,
    onMounted,
    onUnmounted,
    watch,
  } = Vue;

  // 'imports' from vue router
  const {
    useRouter
  } = VueRouter;

  // 'imports' from state
  const {
    app
  } = store.state;

  rows = ref(rows);
  criteria = ref(criteria);
  headers = ref(headers);
  filterFields = ref(filterFields);
  filterDates = ref(filterDates);

  const working = ref(false);

  const ROWS_DISPLAY_INCREMENT = 100;
  const rowsToDisplay = ref(ROWS_DISPLAY_INCREMENT);
  // in order to hook this ref up in a vue component, add ref="scrollElement" to the desired container html el
  const scrollElement = ref(null);

  if (observeScrolling) {
    /**
     * debounce scroll observer function for checking if scrolled to the bottom of the list container
     */
    const scrollObserver = debounce(() => {
      //https://stackoverflow.com/questions/2387136/cross-browser-method-to-determine-vertical-scroll-percentage-in-javascript
      const el = scrollElement.value || document.documentElement;

      const percent = el.scrollTop / (el.scrollHeight - el.clientHeight);

      if (percent > 0.99 && filteredRows.value.length > rowsToDisplay.value)
        rowsToDisplay.value += ROWS_DISPLAY_INCREMENT;
    }, 500);

    onMounted(() => {
      const el = scrollElement.value || window;
      el.addEventListener("scroll", scrollObserver);
    });

    onUnmounted(() => {
      const el = scrollElement.value || window;
      el.removeEventListener("scroll", scrollObserver);
    });
  }

  let filteredRows;
  if (useWorker) {
    const work = AppsWorker('worker-filtering');
    filteredRows = ref(rows.value);

    const recordArgs = computed(() => JSON.stringify(rows.value));
    const headerArgs = computed(() => JSON.stringify(headers.value));
    const criteriaArgs = computed(() => JSON.stringify(criteria.value));

    const gentlyUnload = () => setTimeout(() => working.value = false, 350);

    const workerFilterRows = async () => {
      try {
        console.time('Filtering...'); //DEBUG
        const results = await work.exec('filter', {
          records: recordArgs.value,
          headers: headerArgs.value,
          criteria: criteriaArgs.value
        });
        console.timeEnd('Filtering...');  //DEBUG

        filteredRows.value = results;

        context.emit("update:count", results.length);
        context.emit("update:displayed-rows", results);
      } catch (error) {
        app.errorMessage = error.message;
        working.value = false;
        console.error(error);
      }
    };

    watch(criteriaArgs, async () => {
      console.log('criteria.watcher');
      working.value = true;
      await workerFilterRows();
      gentlyUnload();
    });

    watch(() => [recordArgs.value, headerArgs.value], () => {
      console.log('record*header.watcher');
      workerFilterRows();
    });

    onUnmounted(() => work.worker.terminate());

  } else {
    filteredRows = computed(() => {
      /** @type {VueTableSortFilterCriteria} */
      const crit = criteria.value;
      const lowerSearch = crit.search.toLowerCase();
      const sort = crit.sort;
      const filter = crit.filter;
      const dates = crit.dates;

      const filterProps = Object.keys(filter).filter(
        (prop) => filter[prop] !== undefined && filter[prop] !== ""
      );
      const dateProps = Object.keys(dates).filter(
        (prop) => !!dates[prop] && (!!dates[prop].start || !!dates[prop].end)
      );

      console.time('Filtering...'); //DEBUG

      const filtered = rows.value
        .filter((row) => {
          return (
            headers.value.some(({ prop }) =>
              String(row[prop]).toLowerCase().includes(lowerSearch)
            ) &&
            filterProps.every((prop) => {
              /** @type {string[]} */
              const filterSelections = filter[prop] || [];
              const val = row[prop];
              return filterSelections.some(filteredValue =>
                (typeof val === "function") ? val(filteredValue)
                  : String(val) === String(filteredValue)
              );
            }) &&
            (dateProps.every(prop => {
              const d = dates[prop];
              const val = row[prop];
              return (!d.start || val >= d.start)
                && (!d.end || val <= d.end);
            }))
          );
        })
        .sort((a, b) => {
          if (a[sort.header] === null) return 1;
          if (b[sort.header] === null) return -1;

          const sorter = sort.ascending
            ? a[sort.header] < b[sort.header]
            : a[sort.header] > b[sort.header];

          return sorter ? -1 : 1;
        });

      context.emit("update:count", filtered.length);
      context.emit("update:displayed-rows", filtered);

      console.timeEnd('Filtering...');  //DEBUG

      rowsToDisplay.value = ROWS_DISPLAY_INCREMENT;

      return filtered;
    });
  }

  const displayRows = computed(() =>
    filteredRows.value.slice(0, rowsToDisplay.value)
  );

  if (syncUrlQuery) {

    const router = useRouter();

    /**
     * Parses current route query params for filter fields
     * @returns {Object} criteria
     */
    const parseQueryParametersToCriteria = () => {
      const params = router.currentRoute.value.query;

      const copy = {
        ...params
      };

      const {
        sort = criteria.value.sort.header || "",
        asc = criteria.value.sort.ascending ? "true" : "false",
        search = criteria.value.search || ""
      } = copy;

      delete copy.sort;
      delete copy.asc;
      delete copy.search;

      const queryCriteria = {
        sort: {
          header: sort,
          ascending: asc === "true"
        },
        search,
        filter: { ...criteria.value.filter },
        dates: { ...criteria.value.dates }
      };

      filterFields.value.forEach(({ prop }) => {
        const list = copy[prop];

        let paramArray;
        if (list !== undefined) {
          const q = list.split(',').filter(l => l !== '');
          paramArray = q.map(decodeURIComponent);
        }
        queryCriteria.filter[prop] = paramArray || queryCriteria.filter[prop] || undefined;
      });

      filterDates.value.forEach(d => {
        const param = copy[`df.${d.prop}`];

        if (param) {
          const parts = param.split(':');

          queryCriteria.dates[d.prop] = {
            start: parts[0],
            end: parts[1]
          };
        }
      });

      return queryCriteria;
    };

    /**
     * Parses a given criteria object to a set of query params
     * @returns {Object} query params
     */
    const parseCriteriaToQueryParams = () => {
      const crit = criteria.value;

      const filterQuery = Object.keys(crit.filter)
        .filter(key => Array.isArray(crit.filter[key]))
        .reduce((obj, key) => {
          obj[key] = crit.filter[key].map(encodeURIComponent).join(',');
          return obj;
        }, {});

      const dateQuery = Object.keys(crit.dates)
        .filter(key => !!crit.dates[key] && (!!crit.dates[key].start || !!crit.dates[key].end))
        .reduce((obj, key) => {
          const d = crit.dates[key];
          obj[`df.${key}`] = `${d.start || ''}:${d.end || ''}`;
          return obj;
        }, {});

      const query = {
        ...filterQuery,
        ...dateQuery
      };

      query.sort = crit.sort.header;
      query.asc = crit.sort.ascending;
      if (crit.search !== "")
        query.search = crit.search;

      return query;
    };

    onMounted(() => {
      const crit = parseQueryParametersToCriteria();

      criteria.value.search = crit.search;
      criteria.value.sort = crit.sort;
      criteria.value.filter = crit.filter;
      criteria.value.dates = crit.dates;
    });

    watch(criteria,
      () => {
        const query = parseCriteriaToQueryParams();

        console.log('query', query); //DEBUG

        //preserve params
        const currentParams = app.currentQueryParams;
        Object.keys(currentParams)
          .filter(param => param !== 'sort' && param !== 'asc' && param !== 'search' && !filterFields.value.some(({ prop }) => prop === param) && !filterDates.value.some(({ prop }) => `df.${prop}` === param))
          .forEach(p => query[p] = currentParams[p]);

        router.replace({ path: app.currentRoute, query });
      },
      { deep: true }
    );
  }

  return {
    rows,
    criteria,
    headers,
    filterFields,
    filterDates,
    working,
    rowsToDisplay,
    scrollElement,
    filteredRows,
    displayRows
  }
};