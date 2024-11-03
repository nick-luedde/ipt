<template id="project-edit-view-template">
  <main v-if="!!vm">
    <side-menu-container>
      <article class="mb-3 p-2">
        <h1 class="title is-6 mb-2">
          {{ vm.project.name }} - (v{{ vm.project.version }})
        </h1>
        <div
          v-show="vm.project.status === 'Inactive'"
          class="notification has-text-centered is-warning p-2 mb-1"
        >
          Project is inactive!
        </div>
        <project-action-bar
          class="p-2"
          :vm="vm"
          @project-delete="handleProjectDelete"
          @project-duplicate="handleProjectDuplicate"
          @project-prd-file="handleProjectPrd"
        ></project-action-bar>
        <hr />
      </article>

      <new-item-dropdown
        v-show="!vm.isNew"
        fullwidth
        @type-select="handleNewItem"
      ></new-item-dropdown>

    </side-menu-container>

    <side-menu-content>
      <project-edit-tabs
        :vm="vm"
        v-model:select-item="selectItem"
        v-model:select-higher="selectHigher"
      ></project-edit-tabs>
    </side-menu-content>
  </main>
</template>

<script>
const ProjectEditView = {
  props: {
    id: String,
  },

  setup(props) {
    const { app } = store.state;

    const { projectById } = store.calculated;

    const project = !app.currentQueryParams.isNew
      ? projectById.value[props.id]
      : store.dispatch.project.createNewProject({ id: props.id });

    const vm = project ? useProjectViewModel(project) : null;

    return {
      vm,
      state: {
        app: store.state.app,
        project: store.state.project,
      },
      dispatch: {
        project: store.dispatch.project,
        item: store.dispatch.item,
      },
    };
  },

  created() {
    if (!this.vm) this.$router.replace("/not-found");
  },

  data() {
    return {
      selectItem: null,
      selectHigher: null,
    };
  },

  methods: {
    handleNewItem(type) {
      this.selectItem = this.dispatch.item.createNewItem({
        type,
        project: this.vm.project.id,
        version: this.vm.project.version,
      });
    },
    handleProjectDelete() {
      this.vm.deleteProject();
      this.$router.push("/");
    },
    async handleProjectDuplicate() {
      const copy = this.vm.duplicate();
      const copyVm = useProjectViewModel(copy);

      this.state.app.showLoadingOverlay = true;
      const response = await copyVm.quicksave();
      this.state.app.showLoadingOverlay = false;

      this.$router.push(`/project/${copy.id}`);
    },
    handleProjectPrd() {
      this.vm.createProjectPrdLink();
    },
  },

  template: document.querySelector("#project-edit-view-template").innerHTML,
};

app.component("project-edit-view", ProjectEditView);
</script>