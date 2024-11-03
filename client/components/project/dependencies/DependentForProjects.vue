<template id="dependent-for-projects-template">
  <section class="p-1 light-border">
    <h2 class="subtitle is-6 mb-1">Dependent for</h2>
    <span v-show="vm.dependentForProjects.length === 0" class="is-size-7">(No projects)</span>
    <div class="tags mb-0 are-small">
      <span
        v-for="project in vm.dependentForProjects"
        :key="project.id"
        class="tag"
      >
        <a
          href="#"
          class="has-text-weight-semibold"
          @click.prevent="handleGoToProject(project.id)"
        >
          {{ project.name }}
        </a>
      </span>
    </div>
  </section>
</template>

<script>
const DependentForProjects = {
  props: {
    vm: Object,
  },

  methods: {
    handleGoToProject(id) {
      this.$router.push(`/project/${id}`);
    },
  },

  template: document.querySelector("#dependent-for-projects-template")
    .innerHTML,
};

app.component("dependent-for-projects", DependentForProjects);
</script>