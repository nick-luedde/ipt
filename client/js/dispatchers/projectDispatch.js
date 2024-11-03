const projectDispatch = () => {

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
   * @param {Object} proj - proj to patch
   */
  const patchIntoDataList = (proj) => {
    const {
      state,
      calculated,
      dispatch
    } = store;

    const existing = calculated.projectById.value[proj.id];
    if (existing)
      dispatch.app.mapNewToExisting(existing, proj);
    else
      state.data.projects.push(proj);
  };

  return {
    patchIntoDataList,
    
    /**
     * Requests a project save
     * @param {Object} project - project to save
     */
    async saveProject(project) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.post(`/auth/ds/project/save?session=${state.app.session}`).send(project);
        const saved = response.body;

        mapSavedToExisting(project, saved);
        patchIntoDataList(project);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests a project delete
     * @param {Object} project - project to delete 
     */
    async deleteProject(project) {
      // 'imports' from store.state
      const {
        api,
        state
      } = store;

      state.app.workingQueue.push(true);

      try {
        const response = await api.delete(`/auth/ds/project/delete?session=${state.app.session}`).send(project);

        state.data.projects = state.data.projects
          .filter(proj => proj.id !== project.id);

        state.app.workingQueue.pop();
        return response;
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Requests a project duplicate
     * @param {Object} project - project to duplicate 
     */
    duplicateProject(project) {
      const copy = JSON.parse(JSON.stringify(project));
      copy.name = `Copy of ${copy.name}`;
      copy.id = crypto.randomUUID();

      copy._key = undefined;
      copy.createdDate = null;
      copy.createdBy = null;
      copy.modifiedDate = null;
      copy.modifiedBy = null;

      return copy;
    },

    /**
     * Updates the project version, and all outstanding work items
     * @param {Object} project - project with new version
     */
    async updateProjectVersion(project) {
      // 'imports' from store.state
      const {
        api,
        state,
        dispatch
      } = store;

      state.app.workingQueue.push(true);

      try {
        const projectSave = api.post(`/auth/ds/project/save?session=${state.app.session}`).send(project);
        const itemsSave = api.post(`/auth/ds/project/update-items-version?session=${state.app.session}`).send(project);

        const [projectResponse, itemResponse] = await Promise.all([projectSave, itemsSave]);

        mapSavedToExisting(project, projectResponse.body);
        patchIntoDataList(project);

        itemResponse.body.forEach(savedItem => {
          const dataItem = dispatch.item.patchIntoDataList(savedItem);
          dataItem.version = savedItem.version;
        });

        state.app.workingQueue.pop();
        return {
          projectResponse,
          itemResponse
        };
      } catch (error) {
        console.error(error);
        state.app.errorMessage = error.message;
      }

      state.app.workingQueue.pop();
    },

    /**
     * Creates a new project model
     * @param {Object} [options] - additional project props to set
     */
    createNewProject(options) {
      // 'imports' from store.state
      const {
        state
      } = store;

      const newProject = {
        id: crypto.randomUUID(),
        version: '0.00',
        owner: state.app.user.email,
        categories: [],
        platforms: [],
        dependsOnProjects: [],
        links: [],
        ...options,
      };

      return newProject;
    },

    /**
     * helper to get a router path for a new project
     */
    getNewProjectRoute() {
      const newId = crypto.randomUUID();
      return { path: `/project/${newId}`, query: { isNew: true } };
    }
  };
};