/**
 * logic based on user state
 * @param {string} eml - user email
 * @returns {Object} composed reactive state
 */
const useWorkloadViewModel = (eml) => {
  // 'imports' from Vue
  const {
    ref,
    computed,
    reactive
  } = Vue;

  // 'imports' from store.state
  const {
    state
  } = store;

  // 'imports' from store.calculated
  const {
    itemsByProject
  } = store.calculated;

  const email = ref(eml);

  const username = computed(() => {
    const [primary] = email.value.split('@');
    const parts = primary.split('.');

    return parts.map(p => (p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
  });

  const projects = computed(() => state.data.projects.filter(project => project.owner === email.value));
  const stablePojects = computed(() => projects.value.filter(project => project.status === 'Stable'));
  const activeProjects = computed(() => projects.value.filter(project => ['Planning', 'Development', 'System testing', 'UAT'].includes(project.status)));

  const activeProjectItems = computed(() => {
    let items = [];
    activeProjects.value.forEach(project => {
      const projectItems = itemsByProject.value[project.id] || [];
      const activeItems = projectItems.filter(item => ['New', 'Open', 'Testing'].includes(item.status));
      items = [
        ...items,
        ...activeItems
      ];
    });

    return items;
  });

  const workload = computed(() => {
    // other stats?  items over time...  whatever and whatnot
    
    return {
      stableProjects: stablePojects.value.length,
      activeProjects: activeProjects.value.length,
      activeProjectItems: activeProjectItems.value.length
    };
  });

  return reactive({
    email,
    username,
    projects,
    stablePojects,
    activeProjects,
    activeProjectItems,
    workload
  });
};