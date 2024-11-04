/**
 * Global store to hold app level reactive state
 */
const store = (() => {
  /** @type {VueOverrides} */
  const {
    ref,
    computed,
    reactive,
  } = Vue;

  const state = reactive({
    app: {
      environment: 'development',
      refresh: {
        initialLoadComplete: false,
        lastDataFetch: new Date().toJSON(),
      },
      /** @type {IUser} */
      user: { role: 'dev', email: 'Me', settings: { theme: 'Dark', queue: [], favoriteProjects: ['project-1'] } },
      session: 'session-id-123',
      workingQueue: [],
      errorMessage: '',
      appMessage: '',
      showLoadingOverlay: false,
      currentRoute: '',
      currentQueryParams: {},
      currentNavSection: null,
      currentPageName: null,
      polling: {
        status: '',
        sessionPolls: 0,
        lastUpdate: ''
      },
      confirm: {
        show: false,
        title: '',
        description: '',
        caption: '',
        confirmClasses: '',
        action: null,
        cancel: null,
      },
      config: {
        datasourceUrl: ''
      },
      logs: [],
      title: ''
    },
    data: {
      /** @type {IProject[]} */
      projects: [],
      /** @type {IItem[]} */
      items: [],
      /** @type {IComment[]} */
      comments: [],
      /** @type {ITimeline[]} */
      timelines: [],
      /** @type {IDeployment[]} */
      deployments: [],
    },
    dataModel: {
      model: {}
    },
    project: {
      newProject: null,
    },
    item: {
      newItem: null,
    },
    timeline: {
      newTimeline: null,
    },
    list: {
      /** @type {string[]} */
      types: [],
      /** @type {string[]} */
      priorities: [],
      /** @type {string[]} */
      statuses: [],
      /** @type {string[]} */
      themes: [],
      /** @type {string[]} */
      projectStatuses: [],
      /** @type {string[]} */
      projectPrograms: [],
      /** @type {string[]} */
      accessibilityStatuses: [],
      /** @type {string[]} */
      timelineStatuses: [],
      /** @type {number[]} */
      timelineEfforts: [],
      /** @type {number[]} */
      timelinePriorities: [],
      /** @type {number[]} */
      timelineMagnitudes: [],
      /** @type {string[]} */
      users: []
    }
  });

  const helpers = {
    history: window.history,
    url: {},
    /** 
     * @template T
     * @param {T[]} arr
     * @param {keyof T} keyName
     * @returns {{ [key: string]: T }}
     */
    createKeyMap(arr, keyName = '_key') {
      return arr.reduce((map, el) => {
        map[el[keyName]] = el;
        return map;
      }, {});
    },
    /** 
     * @template T
     * @param {T[]} arr
     * @param {keyof T} keyName
     * @returns {{ [key: string]: T[] }}
     */
    createForeignKeyMap(arr, keyName) {
      return arr.reduce((map, el) => {
        if (!map[el[keyName]])
          map[el[keyName]] = [];

        map[el[keyName]].push(el);
        return map;
      }, {});
    }
  };

  const projectById = computed(() =>
    helpers.createKeyMap(state.data.projects, 'id')
  );

  /**
   * computed state base on global store
   */
  const calculated = {

    /**
     * Experimental flags for in progress dev that may be tested out some in prod for certain cases
     */
    experimental: {
      polling: computed(() => state.app.user)
    },

    activeProjects: computed(() =>
      state.data.projects.filter(proj => proj.status !== 'Inactive')
    ),
    inactiveProjects: computed(() =>
      state.data.projects.filter(proj => proj.status === 'Inactive')
    ),
    activeProjectItems: computed(() =>
      state.data.items.filter(item => {
        const project = projectById.value[item.project];
        return project && project.status !== 'Inactive';
      })
    ),
    projectById,
    deploymentById: computed(() =>
      helpers.createKeyMap(state.data.deployments, 'id')
    ),
    deploymentsByProject: computed(() =>
      helpers.createForeignKeyMap(state.data.deployments, 'project')
    ),
    itemById: computed(() =>
      helpers.createKeyMap(state.data.items, 'id')
    ),
    itemsByProject: computed(() =>
      helpers.createForeignKeyMap(state.data.items, 'project')
    ),
    itemsByItem: computed(() =>
      helpers.createForeignKeyMap(state.data.items, 'parent')
    ),
    commentById: computed(() =>
      helpers.createKeyMap(state.data.comments, 'id')
    ),
    commentsByItem: computed(() =>
      helpers.createForeignKeyMap(state.data.comments, 'item')
    ),
    timelineById: computed(() =>
      helpers.createKeyMap(state.data.timelines, 'id')
    ),
    timelinesByProject: computed(() => {
      const map = {};

      state.data.timelines.forEach(ms => {
        ms.projects.forEach(id => {
          const timelines = map[id] || [];
          timelines.push(ms);
          map[id] = timelines;
        });
      });

      return map;
    }),
    dependentForByProjects: computed(() => {
      const projects = state.data.projects;
      const map = {};

      projects.forEach(child =>
        child.dependsOnProjects.forEach(parent => {
          if (!map[parent])
            map[parent] = [];

          map[parent].push(child);
        })
      );

      return map;
    })
  };

  /**
   * Client API to handle client requests to the server
   */
  const api = MockAppsClient({
    errorHandler: (err) => console.error(err),
    environment: state.app.environment
  });

  /**
   * Global dispatchers to handle app level state change requests
   * public vars from /app/dispatch dir
   */
  const dispatch = {
    app: appDispatch(),
    user: userDispatch(),
    project: projectDispatch(),
    item: itemDispatch(),
    comment: commentDispatch(),
    timeline: timelineDispatch(),
    deployment: deploymentDispatch(),
    util: utilDispatch()
  };

  const schema = DataModel.schema();

  return {
    state,
    helpers,
    calculated,
    api,
    dispatch,
    schema,
  };
})();