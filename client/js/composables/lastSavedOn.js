const useLastSavedOn = (rec, { live = true, interval = 43 } = {}) => {
  // 'imports' from Vue
  const {
    computed,
    ref,
    onUnmounted
  } = Vue;

  const adt = AppsDateTime.adt();

  const currentTime = ref(new Date());
  const intervalId = live ? setInterval(() => currentTime.value = new Date(), 1000 * interval) : null;

  const lastSavedOn = computed(() => {
    if (!rec.modifiedDate) return 'Never';
    const modified = new Date(rec.modifiedDate);
    currentTime.value; //hack for reactivity?
    return adt.interval(modified, { cutoff: 'month' });
  });

  onUnmounted(() => clearInterval(intervalId));

  return {
    lastSavedOn
  };
};