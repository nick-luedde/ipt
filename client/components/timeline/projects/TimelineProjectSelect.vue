<template id="timeline-project-select-template">
  <section>
    <h2 v-show="vm.projects.length > 0" class="subtitle is-6 mb-1">
      Selected projects
    </h2>
    <div class="tags are-small mb-0">
      <span v-for="project in vm.projects" :key="project.id" class="tag m-1">
        <a
          href="#"
          class="has-text-weight-semibold"
          @click.prevent="handleGoToProject(project.id)"
        >
          {{ project.name }}
        </a>
        <button
          class="delete is-small"
          title="Remove project"
          @click="handleRemoveProject(project.id)"
        ></button>
      </span>
    </div>

    <apps-select
      label="Timeline projects"
      size="is-small"
      fullwidth
      :options="projectOptions"
      v-model="newTimelineProject"
      @change="handleNewProject"
    ></apps-select>
  </section>
</template>

<script>
const TimelineProjectSelect = {
  props: {
    vm: Object,
  },

  setup() {
    return {
      state: {
        data: store.state.data,
      },
    };
  },

  data() {
    return {
      newTimelineProject: "",
    };
  },

  computed: {
    projectOptions() {
      return [
        { value: "", text: "-- Select a project --" },
        ...this.state.data.projects
          .filter((proj) => !this.vm.timeline.projects.includes(proj.id))
          .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
          .map((proj) => ({ value: proj.id, text: proj.name })),
      ];
    },
  },

  methods: {
    handleNewProject(id) {
      this.vm.timeline.projects.push(id);
      this.vm.autosave();
      this.newTimelineProject = "";
    },
    handleRemoveProject(id) {
      this.vm.timeline.projects = this.vm.timeline.projects.filter(
        (projId) => projId !== id
      );
      this.vm.autosave();
    },
    handleGoToProject(id) {
      this.$router.push(`/project/${id}`);
    },
  },

  template: document.querySelector("#timeline-project-select-template")
    .innerHTML,
};

app.component("timeline-project-select", TimelineProjectSelect);
</script>