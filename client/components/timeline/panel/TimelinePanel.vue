<template id="timeline-panel-template">
  <section>
    <div class="columns border-radius light-border p-5">
      <div class="column">
        <div class="columns p-0">
          <div class="column p-1">
            <h2 class="title is-6 mb-3">Timeline details</h2>
          </div>

          <div class="column p-1 is-narrow">
            <timeline-action-bar :vm="vm"></timeline-action-bar>
          </div>
        </div>

        <timeline-edit-details :vm="vm"></timeline-edit-details>
      </div>

      <div v-show="vm.projects.length > 0" class="column is-5">
        <project-card
          v-for="project in vm.projects"
          :key="project.id"
          class="mb-2 is-radiusless highlight-border-bottom"
          :project="project"
          :show-favorite="false"
          :show-owner="false"
          :show-item-stats="false"
          @project-click="handleProjectClick"
        ></project-card>
      </div>
    </div>
  </section>
</template>

<script>
const TimelinePanel = {
  props: {
    timeline: Object,
    vm: Object,
  },

  setup(props) {
    const vm = props.vm || useTimelineViewModel(props.timeline);

    return {
      vm,
    };
  },

  data() {
    return {};
  },

  methods: {
    handleProjectClick(project) {
      this.$router.push(`/project/${project.id}`);
    },
  },

  template: document.querySelector("#timeline-panel-template").innerHTML,
};

app.component("timeline-panel", TimelinePanel);
</script>