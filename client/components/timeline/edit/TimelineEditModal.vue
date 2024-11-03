<template id="timeline-edit-modal-template">
  <section class="modal" role="dialog" :class="{ 'is-active': show }">
    <div class="modal-background" @click="handleClose"></div>
    <div class="modal-content box">
      <div class="columns is-mobile is-vcentered">
        <div class="column p-0">
          <h2 class="title is-6 mb-0">Timeline details</h2>
        </div>
        <div
          v-show="!vm.isNew && !vm.isAutosaving"
          class="column pl-2 is-narrow"
        >
          <button class="button is-small is-white">
            <span class="icon">
              <span
                aria-hidden="true"
                class="material-symbols-outlined"
                @click="handleDelete"
                >delete</span
              >
            </span>
          </button>
        </div>
        <div v-show="vm.isAutosaving" class="column pl-2 is-narrow">
          <bulma-spinner></bulma-spinner>
        </div>
      </div>
      <timeline-edit-details :vm="vm"></timeline-edit-details>
    </div>
    <button
      class="modal-close is-large"
      aria-label="close"
      @click="handleClose"
    ></button>
  </section>
</template>

<script>
const TimelineEditModal = {
  props: {
    show: Boolean,
    timeline: Object,
  },

  emits: ["update:show"],

  setup(props) {
    const vm = useTimelineViewModel(props.timeline);

    return {
      vm,
    };
  },

  methods: {
    handleClose() {
      this.$emit("update:show", false);
    },
    async handleDelete() {
      this.vm.deleteTimeline();
    },
  },

  template: document.querySelector("#timeline-edit-modal-template").innerHTML,
};

app.component("timeline-edit-modal", TimelineEditModal);
</script>