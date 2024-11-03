const itemDispatch = () => {

  const mapSavedToExisting = (existing, saved) => {
    existing._key = saved._key;
    existing.itemNumber = saved.itemNumber;
    existing.id = saved.id;
    existing.createdBy = saved.createdBy;
    existing.createdDate = saved.createdDate;
    existing.modifiedBy = saved.modifiedBy;
    existing.modifiedDate = saved.modifiedDate;
  };

  /**
   * Patches the information from the object into the state data lists
   * @param {Object} item - item to patch
   */
  const patchIntoDataList = (item) => {
    const {
      state,
      calculated,
      dispatch
    } = store;

    const existing = calculated.itemById.value[item.id];
    if (existing)
      dispatch.app.mapNewToExisting(existing, item);
    else
      state.data.items.push(item);

    return existing || item;
  };

  return {
    patchIntoDataList,
    /**
     * Requests item save
     * @param {Object} item - item to save
     */
    async saveItem(item) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post(`/auth/ds/item/save?session=${state.app.session}`).send(item);

        const saved = response.body;

        mapSavedToExisting(item, saved);
        patchIntoDataList(saved);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests item delete
     * @param {Object} item 
     */
    async deleteItem(item) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.delete(`/auth/ds/item/delete?session=${state.app.session}`).send(item);

        state.data.items = state.data.items.filter(itm => itm.id !== item.id);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests an item be uploaded and attached
     * @param {Object} blob - blob to attach
     */
    async uploadItemFile(blob) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post('/auth/file/create').send(blob);
        const { id, name, url, size } = response.body;
        blob.id = id;
        blob.url = url;

        //dont keep data prop after upload
        blob.data = undefined;

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    // /** DEPRECATED
    //  * Requests an item file be removed
    //  * @param {Object} file - file metadata
    //  */
    // async deleteItemFile(file) {
    //   // 'imports' from store.state
    //   const {
    //     api,
    //     state
    //   } = store;

    //   state.app.workingQueue.push(true);

    //   try {
    //     const response = await api.delete('/auth/file/delete').send(file.id);

    //     state.app.workingQueue.pop();
    //     return response;
    //   } catch (error) {
    //     console.error(error);
    //     state.app.errorMessage = error.message;
    //   }

    //   state.app.workingQueue.pop();
    // },

    /**
     * Requests an item be uploaded and attached
     * @param {Object} options - options
     * @param {string} [options.url] - optional file url
     * @param {string} [options.id] - optional file id
     */
    async getDriveFileDetails({ url, id }) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post('/auth/file/drive/details').send({ url, id });

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Adds a scheduled item to Google Calendar
     * @param {Object} item - item
     */
    async addItemToCalendar(item) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post('/auth/ds/item/calendar-event').send({ item, startTimeString: item.scheduledDate });

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Creates a new item model
     * @param {Object} [options] - additional item props to set
     */
    createNewItem(options = {}) {
      // 'imports' from store.state
      const {
        state
      } = store;

      const newItem = {
        id: crypto.randomUUID(),
        project: null,
        type: null,
        assignee: state.app.user.email,
        priority: "Medium",
        status: "New",
        version: null,
        files: [],
        tags: [],
        ...options
      };

      return newItem;
    }

  };
};