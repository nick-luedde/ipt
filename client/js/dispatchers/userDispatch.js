const userDispatch = () => {

  const mapSavedToExisting = (existing, saved) => {
    existing._key = saved._key;
    existing.id = saved.id;
    existing.createdBy = saved.createdBy;
    existing.createdDate = saved.createdDate;
    existing.modifiedBy = saved.modifiedBy;
    existing.modifiedDate = saved.modifiedDate;
  };

  /**
   * Requests a user save
   * @param {IUser} user - user to save
   */
  const saveUser = async (user) => {
    // 'imports' from store.state
    const {
      api,
      state
    } = store;

    state.app.workingQueue.push(true);

    try {
      const response = await api.post('/auth/ds/user/save').send(user);
      const saved = response.body;

      mapSavedToExisting(user, saved);

      state.app.workingQueue.pop();
      return response;
    } catch (error) {
      console.error(error);
      state.app.errorMessage = error.message;
    }

    state.app.workingQueue.pop();
  };

  const autosaverForAppUser = async () => {
    const { state } = store;
    return await saveUser(state.app.user);
  };

  const {
    autosave
  } = useAsyncQueueDebouncedAutosave(autosaverForAppUser);

  return {
    saveUser,
    autosaveAppUser: autosave,
  };
};