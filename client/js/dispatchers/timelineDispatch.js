const timelineDispatch = () => {

  const mapSavedToExisting = (existing, saved) => {
    existing._key = saved._key;
    existing.id = saved.id;
    existing.createdBy = saved.createdBy;
    existing.createdDate = saved.createdDate;
    existing.modifiedBy = saved.modifiedBy;
    existing.modifiedDate = saved.modifiedDate;
  };

  /**
   * Patches the information from the object into the state data lists
   * @param {ITimeline} tl - tl to patch
   */
  const patchIntoDataList = (tl) => {
    const {
      state,
      calculated,
      dispatch
    } = store;

    const existing = calculated.timelineById.value[tl.id];
    if (existing)
      dispatch.app.mapNewToExisting(existing, tl);
    else
      state.data.timelines.push(tl);
  };

  return {
    patchIntoDataList,
    
    /**
     * Requests a timeline save
     * @param {Object} timeline - timeline to save
     */
    async saveTimeline(timeline) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      const isNew = (timeline._key === null || timeline._key === undefined);

      state.app.workingQueue.push(true);

      try {
        const response = await api.post(`/auth/ds/timeline/save?session=${state.app.session}`).send(timeline);
        const saved = response.body;

        mapSavedToExisting(timeline, saved);

        if (isNew)
          state.data.timelines.push(timeline);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests a timeline delete
     * @param {Object} timeline - timeline to delete 
     */
    async deleteTimeline(timeline) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.delete(`/auth/ds/timeline/delete?session=${state.app.session}`).send(timeline);

        state.data.timelines = state.data.timelines
          .filter(ml => ml.id !== timeline.id);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Creates a new timeline model
     * @param {Object} [options] - additional timeline props to set
     */
    createNewTimeline(options = {}) {
      const newTimeline = {
        id: crypto.randomUUID(),
        projects: [],
        impacts: [],
        ...options,
      };

      return newTimeline;
    },

    /**
     * helper to get a router path for a new timeline
     */
    getNewTimelineRoute() {
      const newId = crypto.randomUUID();
      return { path: `/timeline/${newId}`, query: { isNew: true } };
    }
  };
};