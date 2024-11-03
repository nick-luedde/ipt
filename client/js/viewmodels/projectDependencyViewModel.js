/**
 * logic based on project state
 * @param {Object} proj - project
 * @returns {Object} composed reactive state
 */
const useProjectDependencyViewModel = (proj) => {
  // 'imports' from Vue
  const {
    computed,
    reactive
  } = Vue;

  // 'imports' from store.state
  const {
    state,
  } = store;

  // 'imports' from store.calculated
  const {
    projectById,
  } = store.calculated;

  const project = reactive(proj);

  const dependencyLayerMap = computed(() => {
    let layerIndex = 1;
    const visited = new Set(project.dependsOnProjects);
    visited.add(project.id);

    let layerProjects = project.dependsOnProjects.map(id => projectById.value[id]).filter(p => !!p);
    const map = {};

    while (layerProjects.length > 0) {
      map[layerIndex] = layerProjects;

      const nextLayerIds = layerProjects
        .reduce((layer, proj) => [...layer, ...proj.dependsOnProjects], []);
      layerProjects = nextLayerIds.map(id => projectById.value[id])
        .filter(p => !!p && !visited.has(p.id));

      nextLayerIds.forEach(id => visited.add(id));
      
      layerIndex++;
    }

    return map;

  });

  return reactive({
    project,
    dependencyLayerMap,
  });
};