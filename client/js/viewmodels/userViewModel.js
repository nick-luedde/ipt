/**
 * logic based on user state
 * @param {Object} usr - user
 * @returns {Object} composed reactive state
 */
 const useUserViewModel = (usr) => {
  // 'imports' from Vue
  const {
    reactive
  } = Vue;

  // 'imports' from store
  const {
    dispatch
  } = store;

  const user = reactive(usr);

  /**
   * dispatches save request
   */
  const saveUser = async () => {
    await dispatch.user.saveUser(user);
  };

  return reactive({
    user,
    saveUser
  });
};