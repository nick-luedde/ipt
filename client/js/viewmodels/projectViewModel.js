/**
 * logic based on project state
 * @param {IProject} proj - project
 */
const useProjectViewModel = (proj) => {
  /** @type {VueOverrides} */
  const {
    computed,
    reactive
  } = Vue;

  // 'imports' from store.state
  const {
    state,
    dispatch,
    schema,
    helpers
  } = store;

  // 'imports' from store.calculated
  const {
    projectById,
    itemById,
    itemsByProject,
    deploymentsByProject,
    timelinesByProject,
    dependentForByProjects
  } = store.calculated;

  const project = reactive(proj);

  const isNew = computed(() => project._key === null || project._key === undefined);
  const isFavorite = computed(() => state.app.user && state.app.user.settings.favoriteProjects.includes(project.id));

  const dependsOnProjects = computed(() => project.dependsOnProjects.map(id => projectById.value[id]).filter(proj => !!proj));
  const dependentForProjects = computed(() => dependentForByProjects.value[project.id] || []);

  const timelines = computed(() => timelinesByProject.value[project.id] || []);
  const currentTimelines = computed(() => {
    const [todayString] = new Date().toJSON().split('T');

    return timelines.value.filter(ms => todayString >= ms.startDate && todayString <= ms.endDate);
  });
  const currentTimelineChartRows = computed(() =>
    currentTimelines.value.map(ms => ({
      timeline: ms.name,
      startDate: new Date(ms.startDate),
      endDate: new Date(ms.endDate),
    }))
  );

  const deployments = computed(() => deploymentsByProject.value[project.id] || []);

  const items = computed(() => itemsByProject.value[project.id] || []);
  const itemsByVersion = computed(() => helpers.createForeignKeyMap(items.value, 'version')); 
  const pendingItems = computed(() => items.value.filter(item => !['Closed', 'Hold'].includes(item.status)));

  const stats = computed(() => {
    const total = items.value.length;
    const pending = pendingItems.value.length;
    const closed = total - pending;
    const percent = closed / (total || 1) * 100;

    return {
      totalItems: total,
      pendingItems: pending,
      closedItems: closed,
      completePercent: `${percent.toFixed(2)}%`
    };
  });
  const versions = computed(() => {
    const uniques = new Set(items.value.map(item => item.version));
    return [...uniques].sort((a, b) => a < b ? -1 : 1);
  });

  const relatedTree = computed(() => {
    const tree = {};

    items.value.forEach(item => {
      const parent = itemById.value[item.parent];
      let parentNode;
      let itemNode;

      if (!!parent) {
        parentNode = tree[parent.id];
        if (!parentNode) {
          parentNode = {
            item: parent,
            parent: null,
            related: []
          };
          tree[parent.id] = parentNode;
        }
      }

      itemNode = tree[item.id];
      if (!itemNode) {
        itemNode = {
          item,
          parent: parentNode,
          related: []
        };

        tree[item.id] = itemNode;
      } else {
        itemNode.parent = parentNode;
      }

      if (parentNode)
        parentNode.related.push(itemNode);
    });

    return tree;
  });

  /**
   * Recursively gets all related items of all related items
   * @param {Object} item - item to get related list
   * @returns {Object[]} list of all related items
   */
  const getDeepItemRelatedList = (item) => {
    const node = relatedTree.value[item.id];
    const items = node.related.map(related => related.item);
    return [
      ...items,
      ...node.related.map(related => getDeepItemRelatedList(related.item)).flat()
    ];
  };

  const validation = useSchemaValidation({ reactiveObj: project, schema: schema.Project });
  const isValid = computed(() => validation.isValid.value);

  const canEdit = computed(() => true);

  const priorityTag = computed(() => {
    const tags = {
      Critical: 'is-danger',
      High: 'is-warning',
      Medium: 'is-dark',
      Low: 'is-light'
    };

    return tags[project.priority] || '';
  });

  /**
   * Quicksaves without queue or validity check
   */
  const quicksave = async () => {
    return await dispatch.project.saveProject(project);
  }

  /**
   * dispatches save request
   */
  const autosaver = async () => {
    if (!isValid.value)
      return;

    return await dispatch.project.saveProject(project);
  };

  const {
    closeQueue,
    enqueue,
    cancelAutosave,
    autosave
  } = useAsyncQueueDebouncedAutosave(autosaver);

  /**
   * Dispatches a save request
   */
  const saveProject = async () => {
    return await enqueue(autosaver);
  };

  /**
   * Dispatches delete request
   */
  const deleteProject = async () => {
    cancelAutosave.value = true;
    const response = enqueue(
      () => dispatch.project.deleteProject(project)
    );
    closeQueue.value = true;
    return await response;
  };

  /**
   * Dispatches an update project version (which will update all outstanding item versions to move them forward to the next v)
   */
  const updateProjectVersion = async (version) => {
    if (!isValid.value)
      return;

    project.version = version;
    return await enqueue(
      () => dispatch.project.updateProjectVersion(project)
    );
  };

  /**
   * Dispatches an update to the user settings for favorit projects
   */
  const toggleProjectFavorite = async () => {
    const user = state.app.user;
    if (!user)
      return;

    if (isFavorite.value)
      user.settings.favoriteProjects = user.settings.favoriteProjects.filter(id => id !== project.id)
    else
      user.settings.favoriteProjects.push(project.id);

    return await dispatch.user.saveUser(user);
  };

  const duplicate = () => dispatch.project.duplicateProject(project);

  /**
   * Creates a PRD file from template, adds to links, saves
   */
  const createProjectPrdLink = async () => {
    const response = await dispatch.util.createPrdTemplate({ name: `${project.name}_PRD` });
    const info = response.body;
    
    // project.links.push({
    //   name: info.name,
    //   url: info.url,
    // });
    autosave();
  };
  
  /**
   * Re-orders the link array (if it is an array that is)
   * @param {Number} currIndex - current item index to re-order
   * @param {Number} newIndex - new index to place item
   */
  const reorderLink = (currIndex, newIndex) => {
    const [el] = project.links.splice(currIndex, 1);
    if (el === undefined)
      throw new Error(`No element at index ${currIndex} in array, cannot re-order!`);

    const adjustedIndex = Math.min(Math.max(newIndex, 0), project.links.length);
    project.links = [
      ...project.links.slice(0, adjustedIndex),
      el,
      ...project.links.slice(adjustedIndex)
    ];
  };

  /**
   * Adds a new link to the links list
   * @param {Object} el - new link el
   */
  const addLink = (el) => project.links.push(el);

  /**
   * Removes a link from the links list
   * @param {Number} index - el to delete
   */
  const removeLink = (index) => {
    const [removed] = project.links.splice(index, 1);
    return removed;
  };

  return reactive({
    project,
    isNew,
    isFavorite,
    dependsOnProjects,
    dependentForProjects,
    timelines,
    currentTimelines,
    currentTimelineChartRows,
    deployments,
    items,
    itemsByVersion,
    pendingItems,
    stats,
    versions,
    relatedTree,
    getDeepItemRelatedList,
    validation,
    isValid,
    canEdit,
    priorityTag,
    quicksave,
    saveProject,
    autosave,
    deleteProject,
    updateProjectVersion,
    toggleProjectFavorite,
    duplicate,
    createProjectPrdLink,
    reorderLink,
    addLink,
    removeLink
  });
};