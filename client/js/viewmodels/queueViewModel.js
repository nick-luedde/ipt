const useQueueViewModel = ({ initialId } = {}) => {
  /** @type {VueOverrides} */
  const {
    ref,
    computed,
    reactive,
  } = Vue;

  const {
    state,
    dispatch,
  } = store;

  const {
    itemById
  } = store.calculated;

  const queue = computed(() =>
    state.app.user.settings.queue || []
  );

  const items = computed(() => queue.value.map(id => itemById.value[id]).filter(Boolean));
  const selectedItem = ref(itemById.value[initialId] || items.value[0]);

  /** @param {string} id */
  const push = (id) => {
    const q = new Set(queue.value);
    q.add(id);
    state.app.user.settings.queue = [...q];

    return itemById.value[id];
  };

  /** @param {string} id */
  const pop = (id) => {
    const q = new Set(queue.value);
    q.delete(id);
    state.app.user.settings.queue = [...q];

    return itemById.value[id];
  };

  /**
   * Reorders the given id in the queue
   * @param {string} id 
   * @param {number} position - new position index
   */
  const reorder = (id, position) => {
    const current = queue.value.indexOf(id);
    if (current === -1) return;

    // dragging current 1 to position 2;
    // should stay the same

    // dragging current 1 to position 1;
    // should stay the same

    const isSame = current === position;
    if (isSame) return;

    const isDown = current < position;
    const targetPosition = isDown ? position - 1 : position;
    if (targetPosition > queue.value.length || targetPosition < 0) return;

    const fresh = queue.value.filter(q => q !== id);

    const ordered = [
      ...fresh.slice(0, targetPosition),
      id,
      ...fresh.slice(targetPosition)
    ];

    state.app.user.settings.queue = ordered;

    return ordered.map(id => itemById.value[id]).filter(Boolean);
  };

  /** @param {IItem} itm */
  const handleNewItem = (itm) => selectedItem.value = itm;

  const autosave = dispatch.user.autosaveAppUser;

  return reactive({
    queue,
    items,
    selectedItem,
    push,
    pop,
    reorder,
    handleNewItem,
    autosave
  });
};