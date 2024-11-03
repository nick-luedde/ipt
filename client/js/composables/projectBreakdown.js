const useProjectBreakdown = ({ my, team, accessibility }) => {
  // 'imports from vue
  const {
    ref,
    computed
  } = Vue;

  // 'imports' from store 
  const {
    state,
    calculated
  } = store;

  // 'imports' from store.calculated 
  const {
    projectById
  } = store.calculated;

  const selectedUsers = ref([]);

  const projects = computed(() => {
    const user = state.app.user;
    if (!user)
      return [];

    if (my)
      return calculated.activeProjects.value
        .filter(project => project.owner === user.email);

    const isInSelectedUsers = (project) => selectedUsers.value.length === 0 || selectedUsers.value.includes(project.owner);

    if (team)
      return calculated.activeProjects.value.filter(isInSelectedUsers);

    if (accessibility)
      return calculated.activeProjects.value
        .filter(project => !!project.accessibilityStatus && project.accessibilityStatus !== 'N/A' && isInSelectedUsers(project));
  });

  const favoriteProjects = computed(() => {
    const user = state.app.user;
    if (!user)
      return [];

    const favorites = user.settings ? (user.settings.favoriteProjects || []) : [];
    return state.data.projects
      .filter(project => favorites.includes(project.id))
      .sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  });

  const activeProjects = computed(() => {
    const user = state.app.user;
    if (!user)
      return [];

    return projects.value
      .filter(project => ['Planning', 'Development', 'System testing', 'UAT'].includes(project.status))
      .sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
  });

  const backlogProjects = computed(() =>
    projects.value.filter(project => project.status === 'Backlog')
  );

  const planningProjects = computed(() =>
    projects.value.filter(project => project.status === 'Planning')
  );

  const developmentProjects = computed(() =>
    projects.value.filter(project => project.status === 'Development')
  );

  const testingProjects = computed(() =>
    projects.value.filter(project => project.status === 'System testing' || project.status === 'UAT')
  );

  const stableProjects = computed(() =>
    projects.value.filter(project => project.status === 'Stable')
  );

  const groupByPriority = (projects) => {
    const priorities = [...state.list.priorities].reverse();
    const group = [...priorities, 'Other']
      .reduce((g, priority) => (g[priority] = []) && g, {});

    projects.forEach(proj => (group[proj.priority] || group.Other).push(proj));
    return group;
  };

  const projectPriorityGroup = computed(() => {
    const projects = activeProjects.value;
    return groupByPriority(projects);
  });

  const projectOwnerPriorityGroup = computed(() => {
    const emails = state.list.users;

    const ownerGroup = emails.reduce((g, email) => (g[email] = []) && g, {});
    activeProjects.value.forEach(proj => ownerGroup[proj.owner].push(proj));

    const group = Object.entries(ownerGroup).reduce((g, [owner, projects]) => (g[owner] = groupByPriority(projects)) && g, {});
    return group;
  });

  const items = computed(() => {
    const user = state.app.user;
    if (!user)
      return [];

    if (my)
      return calculated.activeProjectItems.value
        .filter(item => item.assignee === user.email)
        .map(item => ({ item, project: projectById.value[item.project] }));

    if (team)
      return calculated.activeProjectItems.value
        .filter(item => selectedUsers.value.length === 0 || selectedUsers.value.includes(item.assignee))
        .map(item => ({ item, project: projectById.value[item.project] }));

    if (accessibility)
      return calculated.activeProjectItems.value
        .filter(item => item.type === 'Accessibility')
        .map(item => ({ item, project: projectById.value[item.project] }));

  });

  const openItems = computed(
    () => items.value
      .filter(({ item }) => item.status === 'Open')
      .sort((a, b) => `${a.project.name.toLowerCase()}${a.item.createdDate}` < `${b.project.name.toLowerCase()}${b.item.createdDate}` ? 1 : -1)
  );
  const testingItems = computed(
    () => items.value
      .filter(({ item }) => item.status === 'Testing')
      .sort((a, b) => `${a.project.name.toLowerCase()}${a.item.createdDate}` < `${b.project.name.toLowerCase()}${b.item.createdDate}` ? 1 : -1)
  );
  const pendingItems = computed(() => items.value.filter(({ item }) => !['Closed', 'Hold'].includes(item.status)));

  const pendingScheduledItems = computed(() => {
    const [today] = (new Date()).toJSON().split('T');
    return pendingItems.value
      .filter(({ item }) => item.scheduledDate >= today)
      .sort((a, b) => a.item.scheduledDate < b.item.scheduledDate ? -1 : 1);
  });

  const pendingPastDueItems = computed(() => {
    const [today] = (new Date()).toJSON().split('T');
    return pendingItems.value
      .filter(({ item }) => item.scheduledDate < today)
      .sort((a, b) => a.item.scheduledDate < b.item.scheduledDate ? -1 : 1);
  });

  const stats = computed(() => {
    const totalProjects = projects.value.length;
    const totalItems = items.value.length;
    const pending = pendingItems.value.length;
    const closed = totalItems - pending;
    const percent = closed / (totalItems || 1) * 100;

    return {
      totalProjects,
      totalItems,
      pendingItems: pending,
      closedItems: closed,
      completePercent: `${percent.toFixed(2)}%`
    };
  });

  const sortProjectByPriority = (projects) => {
    const priorities = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3
    };

    return [...projects].sort((a, b) => priorities[a.priority] - priorities[b.priority]);
  };

  return {
    selectedUsers,
    projects,
    favoriteProjects,
    activeProjects,
    backlogProjects,
    planningProjects,
    developmentProjects,
    testingProjects,
    stableProjects,
    projectPriorityGroup,
    projectOwnerPriorityGroup,
    items,
    openItems,
    testingItems,
    pendingItems,
    pendingScheduledItems,
    pendingPastDueItems,
    stats,
    sortProjectByPriority,
  };
};