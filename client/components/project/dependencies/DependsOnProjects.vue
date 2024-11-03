<template id="depends-on-projects-template">
  <section class="p-1 light-border">
    <h2 class="subtitle is-6 mb-1">Depends on</h2>
    <div class="tags are-small mb-0">
      <span
        v-for="project in vm.dependsOnProjects"
        :key="project.id"
        class="tag m-1"
      >
        <a
          href="#"
          class="has-text-weight-semibold"
          @click.prevent="handleGoToProject(project.id)"
        >
          {{ project.name }}
        </a>
        <button
          class="delete is-small"
          title="Delete dependency"
          @click="handleRemoveDependsOn(project.id)"
        ></button>
      </span>
    </div>

    <apps-select
      label="Depends on project"
      size="is-small"
      fullwidth
      :options="projectOptions"
      v-model="newDependsOn"
      @change="handleNewDependsOnProject"
    ></apps-select>
  </section>
</template>

<script>
const DependsOnProjects = {
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
      newDependsOn: "",
    };
  },

  computed: {
    projectOptions() {
      return this.state.data.projects
        .filter(proj => !this.vm.project.dependsOnProjects.includes(proj.id))
        .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
        .map((proj) => ({ value: proj.id, text: proj.name }));
    },
  },

  methods: {
    handleNewDependsOnProject(id) {
      this.vm.project.dependsOnProjects.push(id);
      this.vm.autosave();
      this.newDependsOn = "";
    },
    handleRemoveDependsOn(id) {
      this.vm.project.dependsOnProjects =
        this.vm.project.dependsOnProjects.filter((dependId) => dependId !== id);
      this.vm.autosave();
    },
    handleGoToProject(id) {
      this.$router.push(`/project/${id}`);
    },
  },

  template: document.querySelector("#depends-on-projects-template").innerHTML,
};

app.component("depends-on-projects", DependsOnProjects);
</script>