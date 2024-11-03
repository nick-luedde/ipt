const fnregistry = {
  'item__tags': (val, row) => row.item.tags.includes(val),
  'project__platforms': (val, row) => row.project.platforms.includes(val),
  'project__categories': (val, row) => row.project.categories.includes(val),
  'project__dependsOn': (val, row) => row.project.dependsOnProjects.includes(val),
  'project__dependentFor': (val, row) => row.project.dependentForProjects.some((proj) => proj.id === val),
};

const actions = {
  filter: ({ criteria, records, headers }) => {
    records = typeof records === 'string' ? JSON.parse(records) : records;
    criteria = typeof criteria === 'string' ? JSON.parse(criteria) : criteria;
    headers = typeof headers === 'string' ? JSON.parse(headers) : headers;

    const crit = criteria;
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

    const filtered = records
      .filter((row) => {
        return (
          headers.some(({ prop }) =>
            String(row[prop]).toLowerCase().includes(lowerSearch)
          ) &&
          filterProps.every((prop) => {
            /** @type {string[]} */
            const filterSelections = filter[prop] || [];
            const val = row[prop];
            const lookup = fnregistry[prop];
            return filterSelections.some(filteredValue =>
              (lookup) ? lookup(filteredValue, row)
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

    console.log('FILTERED FROM THE WORKER'); //DEBUG

    return filtered;
  }
};

self.onmessage = (event) => {
  const action = actions[event.data.action];
  if (!action)
    throw new TypeError(`Worker action ${event.data.action} not found!`);

  const result = action.call(null, ...(event.data.args || []));

  postMessage({
    id: event.data.id,
    action: event.data.action,
    result
  });
};