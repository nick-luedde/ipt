const useListFilters = () => {
  // 'imports' from Vue
  const {
    computed,
  } = Vue;

  // 'imports' from state
  const {
    data,
    list
  } = store.state;

  const users = computed(() =>
    data.users
      .sort((a, b) => (a.email < b.email ? -1 : 1))
      .map((user) => ({ value: user.email, text: user.email }))
  );

  const projects = computed(() =>
    data.projects
      .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
      .map(proj => ({ value: proj.id, text: proj.name }))
  );

  const projectStatuses = computed(() =>
    list.projectStatuses
      .map(status => ({ value: status, text: status }))
  );

  const projectPrograms = computed(() =>
    list.projectPrograms
      .map(program => ({ value: program, text: program }))
  );

  const projectPlatforms = computed(() => {
    const uniquePlatforms = new Set();
    data.projects.forEach(project => project.platforms.forEach(plt => uniquePlatforms.add(plt)));
    return [...uniquePlatforms]
      .sort()
      .map(platform => ({ value: platform, text: platform }));
  });

  const projectCategories = computed(() => {
    const uniqueCategories = new Set();
    data.projects.forEach(project => project.categories.forEach(plt => uniqueCategories.add(plt)));
    return [...uniqueCategories]
      .sort()
      .map(category => ({ value: category, text: category }));
  });

  const itemTypes = computed(() =>
    list.types.map(type => ({ value: type, text: type }))
  );

  const itemStatuses = computed(() =>
    list.statuses.map(status => ({ value: status, text: status }))
  );

  const itemTags = computed(() => {
    const set = new Set(data.items.map(itm => itm.tags).flat());
    return [...set].sort().filter(tag => !!tag).map(tag => ({ value: tag, text: tag }));
  });

  const priorities = computed(() =>
    list.priorities.map(priority => ({ value: priority, text: priority }))
  );

  const accessibilityStatuses = computed(() =>
    list.accessibilityStatuses.map(status => ({ value: status, text: status }))
  );

  const timelineStatuses = computed(() =>
    list.timelineStatuses.map(status => ({ value: status, text: status }))
  );

  const timelineImpacts = computed(() => {
    const set = new Set(data.timelines.map(tl => tl.impacts).flat());
    return [...set].sort().filter(impact => !!impact).map(impact => ({ value: impact, text: impact }));
  });

  return {
    users,
    projects,
    projectStatuses,
    projectPrograms,
    projectPlatforms,
    projectCategories,
    itemTypes,
    itemStatuses,
    itemTags,
    priorities,
    accessibilityStatuses,
    timelineStatuses,
    timelineImpacts
  };
}