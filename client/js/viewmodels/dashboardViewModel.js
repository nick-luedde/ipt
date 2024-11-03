const useDashboardViewModel = ({ my, team }) => {
  // 'imports from vue
  const {
    reactive,
    computed
  } = Vue;

  // 'imports' from store 
  const {
    state,
  } = store;

  const {
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
  } = useProjectBreakdown({ my, team });

  const workloadVms = computed(() => state.list.users.map(email => useWorkloadViewModel(email)));

  return reactive({
    selectedUsers,
    projects,
    favoriteProjects,
    activeProjects,
    backlogProjects,
    planningProjects,
    developmentProjects,
    testingProjects,
    stableProjects,
    items,
    openItems,
    testingItems,
    pendingItems,
    pendingScheduledItems,
    pendingPastDueItems,
    projectPriorityGroup,
    projectOwnerPriorityGroup,
    stats,
    sortProjectByPriority,
    workloadVms
  });
};