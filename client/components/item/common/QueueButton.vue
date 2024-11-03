<template id="queue-button-template">
  <button
    :style="style"
    class="button is-small p-0"
    :class="classes"
    :title="title"
    @click="handleClick"
  >
    <span class="icon">
      <span
        aria-hidden="true"
        class="material-symbols-outlined"
      >{{ icon }}</span>
    </span>
  </button>
</template>

<script>
export default {
  props: {
    show: Boolean,
    queued: Boolean,
    size: {
      type: String,
      default: '24px'
    },

  },

  emits: ['push', 'pop'],

  setup(props, ctx) {
    /** @type {VueOverrides} */
    const {
      computed,
    } = Vue;

    const icon = computed(() => props.queued ? 'remove_circle' : 'queue');
    const title = computed(() => props.queued ? 'Remove from item queue' : 'Add to item queue');
    const style = computed(() => ({ height: props.size, width: props.size }));
    const classes = computed(() => ({ 'is-info': props.queued, 'is-white': !props.queued }));

    const handleClick = () => ctx.emit(props.queued ? 'pop' : 'push');

    return {
      icon,
      title,
      style,
      classes,
      handleClick
    };
  },

  data() {
    return {}
  },

  template: document.querySelector('#queue-button-template').innerHTML
};

app.component('queue-button', QueueButton);
</script>