const actions = {
  fts: (search, models, { limit = 20 } = {}) => {
    models = typeof models === 'string' ? JSON.parse(models) : models;

    const itemsMap = models.items.reduce((o, i) => {
      o[i.id] = i;
      return o;
    }, {});

    const projects = models.projects
      .filter(row => Object.values(row).some(val => String(val).toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.name > b.name ? 1 : -1);
    const items = models.items
      .filter(row => Object.values(row).some(val => String(val).toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.name > b.name ? 1 : -1);
    const comments = models.comments
      .filter(row => Object.values(row).some(val => String(val).toLocaleLowerCase().includes(search)))
      .map(c => itemsMap[c.item])
      .filter(c => !!c && !items.some(i => i.id === c.id))
      .sort((a, b) => a.name > b.name ? 1 : -1);

    const results = [
      ...projects.map(model => ({ type: 'Project', model })),
      ...items.map(model => ({ type: 'Item', model })),
      ...comments.map(model => ({ type: 'Item', model }))
    ];

    return results.slice(0, limit);
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