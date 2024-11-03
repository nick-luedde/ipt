const deploymentDispatch = () => {

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
   * @param {IDeployment} dep - dep to patch
   */
  const patchIntoDataList = (dep) => {
    const {
      state,
      calculated,
      dispatch
    } = store;

    const existing = calculated.deploymentById.value[dep.id];
    if (existing)
      dispatch.app.mapNewToExisting(existing, dep);
    else
      state.data.deployments.push(dep);
  };

  return {
    patchIntoDataList,
    
    /**
     * Requests a deployment save
     * @param {IDeployment} deployment - deployment to save
     */
    async saveDeployment(deployment) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post(`/auth/ds/deployment/save?session=${state.app.session}`).send(deployment);
        const saved = response.body;

        mapSavedToExisting(deployment, saved);
        patchIntoDataList(deployment);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests a deployment delete
     * @param {IDeployment} deployment - deployment to delete 
     */
    async deleteDeployment(deployment) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.delete(`/auth/ds/deployment/delete?session=${state.app.session}`).send(deployment);

        state.data.deployments = state.data.deployments
          .filter(dep => dep.id !== deployment.id);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Creates a new deployment model
     * @param {Partial<IDeployment>} [options] - additional deployment props to set
     */
    createNewDeployment(options) {
      // 'imports' from store.state
      const {
        state
      } = store;

      /** @type {IDeployment} */
      const newDeployment = {
        id: crypto.randomUUID(),
        version: 'new',
        owner: state.app.user.email,
        tags: [],
        date: (new Date()).toJSON().split('T')[0],
        description: '',
        notes: '',
        scheduled: null,
        project: null,
        ...options,
      };

      return newDeployment;
    },

    /**
     * helper to get a router path for a new deployment
     */
    getNewDeploymentRoute() {
      const newId = crypto.randomUUID();
      return { path: `/deployment/${newId}`, query: { isNew: true } };
    }
  };
};