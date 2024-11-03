// ************************** CURRENTLY NOT IN USE!!! ***************************


/**
 * logic based on comment state
 * @param {Object} cmt - comment
 * @returns {Object} composed reactive state
 */
 const useItemCommentViewModel = (cmt) => {
  // 'imports' from Vue
  const {
    computed,
    reactive
  } = Vue;

  // 'imports' from store
  const {
    dispatch
  } = store;

  // 'imports' from store.calculated
  const {
    projectById,
    itemByKey,
  } = store.calculated;

  const comment = reactive(cmt);

  const item = computed(() => itemByKey.value[comment.item]);
  const project = computed(() => projectById.value[item.value.project]);

  const validation = useSchemaValidation({ reactiveObj: comment, schema: schema.Comment });
  const isValid = computed(() => validation.isValid.value);

  const canEdit = computed(() => true);

  /**
   * dispatches save request
   */
  const saveComment = async () => {
    return await dispatch.saveComment(comment, item.value);
  };

  return reactive({
    comment,
    item,
    project,
    validation,
    isValid,
    canEdit,
    saveComment
  });
};