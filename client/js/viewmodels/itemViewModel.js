/**
 * logic based on item state
 * @param {IItem} itm - item
 */
const useItemViewModel = (itm) => {
  /** @type {VueOverrides} */
  const {
    computed,
    reactive
  } = Vue;

  // 'imports' from store
  const {
    state,
    dispatch,
    schema
  } = store;

  // 'imports' from store.calculated
  const {
    projectById,
    itemById,
    itemsByItem,
    commentsByItem,
    itemsByProject,
  } = store.calculated;

  const item = reactive(itm);

  const isNew = computed(() => item._key === null || item._key === undefined);

  const project = computed(() => projectById.value[item.project]);
  const parentItem = computed(() => itemById.value[item.parent]);
  const relatedItems = computed(() => itemsByItem.value[item.id] || []);
  const comments = computed(() => [...(commentsByItem.value[item.id] || [])].reverse());

  const isHigherOrderType = (/** @type {IItemType} */ type) => {
    return type === 'Feature'
      || type === 'Epic';
  };

  const higherOrderType = computed(() => isHigherOrderType(item.type));

  const parentHighers = computed(() => {
    let parent = parentItem.value;
    const highers = [];

    while (parent) {
      if (isHigherOrderType(parent.type))
        highers.push(parent);
      parent = itemById.value[parent.parent];

      if (!!parent && parent.id === parent.parent)
        break;
    }

    return highers;
  });

  const projectItems = computed(() => itemsByProject.value[item.project] || []);

  const itemStatusBulmaClass = computed(() => {
    const colors = {
      New: "has-background-white",
      Open: "has-background-warning-light",
      Testing: "has-background-success-light",
      Closed: "has-background-info-light",
      Hold: "has-background-light",
    };

    return colors[item.status] || "";
  });
  const itemStatusBulmaTag = computed(() => {
    const colors = {
      New: "is-light",
      Open: "is-warning",
      Testing: "is-success",
      Closed: "is-info",
      Hold: "is-dark",
    };

    return colors[item.status] || "";
  });

  const validation = useSchemaValidation({ reactiveObj: item, schema: schema.Item });
  const isValid = computed(() => validation.isValid.value);

  const canEdit = computed(() => true);

  const isQueued = computed(() =>
    state.app.user.settings.queue
    && state.app.user.settings.queue.includes(item.id)
  );

  const pushToQueue = async () => {
    const queue = new Set(state.app.user.settings.queue || []);
    queue.add(item.id);
    state.app.user.settings.queue = [...queue];
    return dispatch.user.autosaveAppUser();
  };

  const popFromQueue = async () => {
    const queue = new Set(state.app.user.settings.queue || []);
    queue.delete(item.id);
    state.app.user.settings.queue = [...queue];
    return dispatch.user.autosaveAppUser();
  };

  /**
   * Quicksaves without queue or validity check
   */
  const quicksave = async () => {
    return await dispatch.item.saveItem(item);
  }

  /**
   * dispatches a save request
   */
  const autosaver = async () => {
    if (!isValid.value)
      return;

    return await dispatch.item.saveItem(item);
  };

  const {
    closeQueue,
    enqueue,
    cancelAutosave,
    autosave
  } = useAsyncQueueDebouncedAutosave(autosaver);

  /**
   * dispatches save request
   */
  const saveItem = async () => {
    return await enqueue(autosaver);
  };

  /**
   * dispatches a delete request
   */
  const deleteItem = async () => {
    cancelAutosave.value = true;
    const response = enqueue(
      () => dispatch.item.deleteItem(item)
    );
    closeQueue.value = true;
    return await response;
  };

  /**
   * Dispatches an file upload request
   * @param {Object} blob - blob metadata
   */
  const uploadFile = async (blob) => {
    return await enqueue(
      () => dispatch.item.uploadItemFile(blob)
    );
  };

  // /** DEPRECATED
  //  * Disatches a file remove request
  //  * @param {Object} file - file metadata
  //  */
  // const removeFile = async (file) => {
  //   return await enqueue(
  //     () => dispatch.item.deleteItemFile(file)
  //   );
  // };

  /**
   * Dispatches file details, then adds to files
   * @param {string} url - url of file to attach
   */
  const attachDriveFileDetails = async (url) => {
    const response = await dispatch.item.getDriveFileDetails({ url });
    if (response) {
      const info = response.body;
      item.files.push({
        id: info.id,
        name: info.name,
        url: info.url
      });
      autosave();
    }
  };

  /**
   * Dispatches a comment save
   * @param {string} com - comment string to post
   */
  const postComment = async (com) => {
    const newComment = {
      id: null,
      item: item.id,
      comment: com
    };

    return await dispatch.comment.saveComment(newComment, item);
  };

  /**
   * Dispatches delete request
   * @param {Object} comment - comment to delete
   */
  const deleteComment = async (comment) => {
    return await dispatch.comment.deleteComment(comment);
  }

  /**
   * Links a the given child item with this as parent
   * @param {Object} childItem - child item to link
   */
  const linkChildItem = async (childItem) => {
    childItem.parent = item.id;
    return await enqueue(
      () => dispatch.item.saveItem(childItem)
    );
  };

  /**
   * dispatches a add item to calendar request
   */
  const addToCalendar = async () => {
    return await dispatch.item.addItemToCalendar(item);
  };

  /**
   * Automatically manages the items closed date property (and potentially resolved date if it is not set) when the status is changed
   * @param {string} status - new status to apply
   */
  const autoResolveItemByStatus = async (status) => {
    if (status === item.status)
      return;
    const prev = item.status;
    item.status = status;

    if (status === 'Closed') {
      const [todayString] = new Date().toJSON().split('T');

      item.resolvedDate = item.resolvedDate || todayString;
      item.closedDate = todayString;
    } else if (prev === 'Closed') {
      item.closedDate = '';
    }

    return await quicksave();
  };

  return reactive({
    item,
    isNew,
    project,
    parentItem,
    relatedItems,
    comments,
    higherOrderType,
    parentHighers,
    projectItems,
    itemStatusBulmaClass,
    itemStatusBulmaTag,
    validation,
    isValid,
    canEdit,
    isQueued,
    pushToQueue,
    popFromQueue,
    quicksave,
    saveItem,
    autosave,
    uploadFile,
    attachDriveFileDetails,
    postComment,
    deleteComment,
    linkChildItem,
    addToCalendar,
    deleteItem,
    autoResolveItemByStatus
  });
};