<template id="timeline-edit-view-template">
  <main v-if="!!vm">
    <side-menu-container>
      <article class="p-2">
        <h1 class="title is-6">Timeline</h1>
        <hr />

        <timeline-action-bar :vm="vm"></timeline-action-bar>

        <p v-show="!vm.isNew">
          <a href="#" @click.prevent="handleGoToTimeline">Open in timelines chart</a>
        </p>
      </article>
    </side-menu-container>

    <side-menu-content>
      <timeline-edit-tabs :vm="vm"></timeline-edit-tabs>
    </side-menu-content>
  </main>
</template>

<script>
const TimelineEditView = {
  props: {
    id: String,
  },

  setup(props) {
    const { state } = store;

    const { timelineById } = store.calculated;

    const timeline = !state.app.currentQueryParams.isNew
      ? timelineById.value[props.id]
      : store.dispatch.timeline.createNewTimeline({ id: props.id });

    const vm = timeline ? useTimelineViewModel(timeline) : null;

    return {
      vm,
      state: {
        app: store.state.app,
        timeline: store.state.timeline,
      },
    };
  },

  created() {
    if (!this.vm) this.$router.replace("/not-found");
  },

  data() {
    return {};
  },

  methods: {
    handleGoToTimeline() {
      const timeline = this.vm.timeline;

      this.$router.push({
        path: "/timelines-chart",
        query: {
          id: timeline.id,
          start: timeline.startDate,
          end: timeline.endDate,
          status: timeline.status,
        },
      });
    },
  },

  template: document.querySelector("#timeline-edit-view-template").innerHTML,
};

app.component("timeline-edit-view", TimelineEditView);
</script>