const commentDispatch = () => {

  const mapSavedToExisting = (existing, saved) => {
    existing._key = saved._key;
    existing.id = saved.id;
    existing.createdBy = saved.createdBy;
    existing.createdDate = saved.createdDate;
  };

  /**
   * Patches the information from the object into the state data lists
   * @param {IComment} comm - comm to patch
   */
  const patchIntoDataList = (comm) => {
    const {
      state,
      calculated,
      dispatch
    } = store;

    const existing = calculated.commentById.value[comm.id];
    if (existing)
      dispatch.app.mapNewToExisting(existing, comm);
    else
      state.data.comments.push(comm);
  };

  return {
    patchIntoDataList,
    
    /**
     * Requests comment save
     * @param {Object} comment - comment to save
     * @param {Object} item - item to update on save
     */
    async saveComment(comment, item) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      const isNew = (comment._key === null || comment._key === undefined);

      state.app.workingQueue.push(true);

      try {
        const response = await api.post(`/auth/ds/comment/save?session=${state.app.session}`).send(comment);
        const saved = response.body;

        mapSavedToExisting(comment, saved.comment);
        // update item metadata too
        item.modifiedDate = saved.item.modifiedDate;
        item.modifiedBy = saved.item.modifiedBy;

        if (isNew)
          state.data.comments.push(comment);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Request comment delete
     * @param {Object} comment - comment to delete
     */
    async deleteComment(comment) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.delete(`/auth/ds/comment/delete?session=${state.app.session}`).send(comment);

        state.data.comments = state.data.comments.filter(com => com.id !== comment.id);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    }
  };
};