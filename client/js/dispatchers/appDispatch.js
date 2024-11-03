/**
 * Dispatch definition
 */
const appDispatch = () => {

  if (localStorage.getItem('__isp_sys_log'))
    localStorage.removeItem('__isp_sys_log');

  /**
   * Handles mapping server response data to store
   * @param {Object} response - server response data
   */
  const handleAppDataResponse = (response) => {
    const { state } = store;

    const {
      types,
      priorities,
      statuses,
      themes,
      projectStatuses,
      projectPrograms,
      accessibilityStatuses,
      timelineStatuses,
      timelineEfforts,
      timelinePriorities,
      timelineMagnitudes,
      users
    } = response.body.lists;

    const {
      datasourceUrl
    } = response.body.config;

    state.app.config.datasourceUrl = datasourceUrl;

    state.list.types = types;
    state.list.priorities = priorities;
    state.list.statuses = statuses;
    state.list.themes = themes;
    state.list.projectStatuses = projectStatuses;
    state.list.projectPrograms = projectPrograms;
    state.list.accessibilityStatuses = accessibilityStatuses;
    state.list.timelineStatuses = timelineStatuses;
    state.list.timelineEfforts = timelineEfforts;
    state.list.timelinePriorities = timelinePriorities;
    state.list.timelineMagnitudes = timelineMagnitudes;
    state.list.users = users;

    state.dataModel.model = response.body.DataModel;

    const models = response.body.models;

    state.data.projects = models.projects;
    state.data.items = models.items;
    state.data.comments = models.comments;
    state.data.timelines = models.timelines;
    // state.data.deployments = models.deployments;
    state.data.users = models.users;

    return state;
  };

  /**
   * Handles patching poll response objects to store
   * @param {AppsDataPollUpdate[]} records - server poll response records
   */
  const patchPollResponse = (records) => {
    const { dispatch } = store;
    const { data } = store.state;
    records.forEach(update => {
      const models = data[`${update.model.toLowerCase()}s`];
      const index = models.findIndex(m => m._key === update.rec._key);

      // delete, update, or add
      if (update.del && index !== -1)
        models.splice(index, 1);
      else if (index !== -1)
        dispatch.app.mapNewToExisting(models[index], update.rec);
      else
        models.push(update.rec);
    });
  };

  // let syslog;
  // const initSyslog = () => systemLogger({ local: true, maxEntries: 100 });
  // const getSyslog = () => {
  //   if (!syslog)
  //     syslog = initSyslog();

  //   return syslog;
  // };

  return {

    // getSyslog,

    /**
     * Maps new model data to existimg model props
     * @param {Object} currentObj - current object
     * @param {Object} newObj - new object
     */
    mapNewToExisting(currentObj, newObj) {
      Object.keys(newObj).forEach(prop => currentObj[prop] = newObj[prop]);
    },

    /**
     * Updates a given requirement
     * @param {Object} requirement - requirement to update
     */
    async loadAppData({ bypassWorkingQueue = false } = {}) {
      const {
        state,
        api,
      } = store;

      if (!bypassWorkingQueue)
        state.app.workingQueue.push(true);

      try {
        const response = await api.get(`/auth/ds/app-data?session=${state.app.session}`).send();
        handleAppDataResponse(response);

        state.app.refresh.initialLoadComplete = true;

      } catch (error) {
        console.log(error);
        state.app.errorMessage = error.message;
      }

      if (!bypassWorkingQueue)
        state.app.workingQueue.pop();
    },

    /**
     * Loads latest data changes 
     */
    async loadLatestData({ showWorkingQueue = true, force = false } = {}) {
      const {
        state,
        api,
        dispatch
      } = store;

      const { refresh } = state.app;

      console.log('loadLatestData');

      const WAIT = 1000 * 60 * 15;
      const now = new Date();
      if (!force && (!refresh.initialLoadComplete || now - new Date(refresh.lastDataFetch) < WAIT))
        return;

      if (showWorkingQueue)
        state.app.workingQueue.push(true);

      try {
        const response = await api.get(`/auth/ds/app-data/latest?start=${encodeURIComponent(refresh.lastDataFetch)}`).send();

        const models = response.body;
        models.projects.forEach(dispatch.project.patchIntoDataList);
        models.items.forEach(dispatch.item.patchIntoDataList);
        models.comments.forEach(dispatch.comment.patchIntoDataList);
        models.timelines.forEach(dispatch.timeline.patchIntoDataList);
        // models.deployments.forEach(dispatch.deployment.patchIntoDataList);

        refresh.lastDataFetch = now.toJSON();

      } catch (error) {
        console.log(error);
        state.app.errorMessage = error.message;
        state.app.error = error;
      }

      if (showWorkingQueue)
        state.app.workingQueue.pop();
    },

    /**
     * @deprecated
     * Sends a poll request for new server data
     */
    async pollServerData() {
      const {
        state,
        api,
      } = store;

      // Don't trap errors here since this is designed to be used as a scheduled poll method, and we want the poller to handle errors
      // getSyslog().log({ message: 'Polling for server data' });
      const response = await api.get(`/auth/ds/app-data-poll?session=${state.app.session}`).send();

      if (response.status !== 200)
        throw new Error(response.body.message);

      // getSyslog().log({ message: `Poll responds with ${!response.body ? 'empty' : 'new data'}` });

      if (response.body)
        handleAppDataResponse(response);

      return response;
    },

    /**
     * @deprecated
     * Sends a long-poll request for server data
     */
    async longPollServerData() {
      const {
        state,
        api,
      } = store;

      // Don't trap errors here since this is designed to be used as a scheduled poll method, and we want the poller to handle errors
      // getSyslog().log({ message: 'Long polling for server data' });
      const response = await api.get(`/auth/ds/long-poll?session=${state.app.session}`).send();

      if (response.status !== 200)
        throw new Error(response.body.message);

      const { incrementals, all } = response.body;

      if (incrementals) {
        // getSyslog().log({ message: `Long poll responds with ${incrementals.length === 0 ? 'empty' : incrementals.length + ' record(s)'}` });

        if (incrementals.length > 0)
          patchPollResponse(incrementals);
      } else if (all) {
        // getSyslog().log({ message: `Long poll responds with all fresh data` });
        handleAppDataResponse({ body: all });
      }

      state.app.polling.sessionPolls++;
      state.app.polling.lastUpdate = new Date().toLocaleString();

      return response;
    },

    /**
     * @deprecated
     * Requests that the poller be cancelled
     */
    disconnectPoller() {
      const {
        state,
        api,
      } = store;
      console.log('disconnectPoller'); //DEBUG

      try {
        // getSyslog().log({ message: 'Disconnected, cancelling poller...' });

        console.log('disconnectPoller post()'); //DEBUG
        const response = api.post(`/auth/ds/cancel-poll?session=${state.app.session}`).send();

        return response;
      } catch (err) {
        console.error(err);
      }
    }

  };
};