/**
 * logic based on timeline state
 * @param {Object} mile - timeline
 * @returns {Object} composed reactive state
 */
const useTimelineViewModel = (mile) => {
  // 'imports' from Vue
  const {
    computed,
    reactive
  } = Vue;

  // 'imports' from store.state
  const {
    dispatch,
    schema
  } = store;

  // 'imports' from store.calculated
  const {
    projectById
  } = store.calculated;

  const adt = AppsDateTime.adt();

  const timeline = reactive(mile);

  const isNew = computed(() => timeline._key === null || timeline._key === undefined);
  const projects = computed(() => timeline.projects.map(id => projectById.value[id]).filter(p => !!p));

  const startDate = computed(() => {
    if (!timeline.startDate)
      return new Date(null);

    return adt.fromString(timeline.startDate) || new Date(null);
  });
  const endDate = computed(() => {
    if (!timeline.endDate)
      return new Date(null);

    return adt.fromString(timeline.endDate) || new Date(null);
  });

  // Formula to estimate the 'complexity' of a timeline
  const complexityIndex = computed(() => {
    const weights = {
      effort: .20,
      priority: .40,
      magnitude: .20,
      duration: .10,
      projects: .10
    };

    const durationLogE = Math.log(endDate.value.valueOf() - startDate.value.valueOf());

    const index =
      (timeline.effort || 0) * weights.effort +
      (timeline.priority || 0) * weights.priority +
      (timeline.magnitude || 0) * weights.magnitude +
      (durationLogE || 0) * weights.duration +
      projects.value.length * weights.effort;

    return Math.round(index * 100) / 100;
  });

  const duration = computed(() =>
    !timeline.startDate || !timeline.endDate ? '(unknown)' : adt.diff(startDate.value, endDate.value).pretty()
  );
  const isPast = computed(() => endDate.value < new Date());
  const remaining = computed(() => !timeline.endDate ? '(unknown)' : isPast.value ? '0 days' : adt.interval(endDate.value));

  const statusBulmaTag = computed(() => {
    const tags = {
      Open: 'is-success',
      Closed: 'is-info',
    };

    return tags[timeline.status] || 'is-light';
  });

  const validation = useSchemaValidation({ reactiveObj: timeline, schema: schema.Timeline });
  const isValid = computed(() => validation.isValid.value);

  const canEdit = computed(() => true);

  /**
   * Quicksaves without queue or validity check
   */
  const quicksave = async () => {
    return await dispatch.timeline.saveTimeline(timeline);
  }

  /**
   * dispatches save request
   */
  const autosaver = async () => {
    if (!isValid.value)
      return;

    return await dispatch.timeline.saveTimeline(timeline);
  };

  const {
    closeQueue,
    enqueue,
    cancelAutosave,
    autosave,
    isAutosaving
  } = useAsyncQueueDebouncedAutosave(autosaver);

  /**
   * Dispatches a save request
   */
  const saveTimeline = async () => {
    return await enqueue(autosaver);
  };

  /**
   * Dispatches delete request
   */
  const deleteTimeline = async () => {
    cancelAutosave.value = true;
    const response = enqueue(
      () => dispatch.timeline.deleteTimeline(timeline)
    );
    closeQueue.value = true;
    return await response;
  };

  return reactive({
    timeline,
    isNew,
    projects,
    startDate,
    endDate,
    complexityIndex,
    duration,
    remaining,
    statusBulmaTag,
    validation,
    isValid,
    canEdit,
    quicksave,
    saveTimeline,
    autosave,
    isAutosaving,
    deleteTimeline,
  });
};