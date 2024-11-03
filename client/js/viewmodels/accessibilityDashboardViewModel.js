const useAccessibilityDashboardViewModel = () => {
  // 'imports from vue
  const {
    reactive,
  } = Vue;

  const { 
    selectedUsers,
    projects,
    activeProjects,
    backlogProjects,
    planningProjects,
    developmentProjects,
    testingProjects,
    stableProjects,
    items,
    pendingItems,
    pendingScheduledItems,
    pendingPastDueItems,
    stats,
    sortProjectByPriority,
  } = useProjectBreakdown({ accessibility: true });

  return reactive({
    selectedUsers,
    projects,
    activeProjects,
    backlogProjects,
    planningProjects,
    developmentProjects,
    testingProjects,
    stableProjects,
    items,
    pendingItems,
    pendingScheduledItems,
    pendingPastDueItems,
    stats,
    sortProjectByPriority
  });
};