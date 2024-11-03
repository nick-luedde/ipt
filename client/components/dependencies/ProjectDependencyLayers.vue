<template id="project-dependency-layers-template">
  <article class="columns is-multiline is-vcentered">
    <div
      v-for="(layer, layerIndex, index) in vm.dependencyLayerMap"
      :key="layerIndex"
      class="column is-narrow"
    >
      <div class="is-flex is-align-items-center">
        <div class="light-border">
          <h3 class="title is-6 mb-1 p-2 light-border-bottom has-background-grey-lighter">Dependency layer #{{ layerIndex }}</h3>
          <ul class="pb-3 pr-3 pl-3 pt-1">
            <li v-for="project in layer" :key="project.id">
              <a
                href="#"
                class="is-size-7 has-text-dark"
                @click.prevent="handleGoToProject(project)"
              >
                {{ project.name }}
              </a>
            </li>
          </ul>
        </div>
        <span v-show="index < lastLayerArrayIndex" class="icon pl-5">
          <span aria-hidden="true" class="material-symbols-outlined">arrow_forward_ios</span>
        </span>
      </div>
    </div>
  </article>
</template>

<script>
const ProjectDependencyLayers = {
  props: {
    vm: Object,
  },

  computed: {
    lastLayerArrayIndex() {
      return Object.keys(this.vm.dependencyLayerMap).length - 1;
    }
  },

  methods: {
    handleGoToProject(project) {
      this.$router.push(`/project/${project.id}`);
    },
  },

  template: document.querySelector("#project-dependency-layers-template")
    .innerHTML,
};

app.component("project-dependency-layers", ProjectDependencyLayers);
</script>