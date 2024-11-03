<template id="project-action-bar-template">
  <section class="mb-3">
    <article class="p-0">
      <span class="icon-text">
        <span v-show="!vm.isNew" class="is-size-7">
          Created: {{ createdDisplay }} | <last-saved-on :rec="vm.project"></last-saved-on>
        </span>
      </span>
    </article>

    <article class="is-pulled-right">
      <div v-show="!vm.isNew" class="buttons">
        <toggle-project-favorite
          size="is-small"
          :vm="vm"
        ></toggle-project-favorite>
        <!-- <button
          class="button is-outlined is-small"
          title="Create PRD"
          ref="prdButton"
          @click="handlePrd"
        >
          <span class="icon is-small">
            <span class="material-symbols-outlined" aria-hidden="true">description</span>
          </span>
        </button> -->
        <button
          class="button is-outlined is-small"
          title="Duplicate project"
          ref="duplicateButton"
          @click="handleDuplicate"
        >
          <span class="icon is-small">
            <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
          </span>
        </button>
        <button
          class="button is-danger is-outlined is-small"
          title="Delete project"
          ref="deleteButton"
          @click="handleDelete"
        >
          <span class="icon is-small">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </span>
        </button>
      </div>
    </article>
  </section>
</template>

<script>
const ProjectActionBar = {
  props: {
    vm: Object,
  },

  emits: ["project-delete", "project-duplicate", "project-prd-file"],

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  computed: {
    createdDisplay() {
      const date = this.vm.project.createdDate;
      if (!date) return "unknown";

      return new Date(date).toLocaleDateString();
    }
  },

  methods: {
    handleDelete() {
      const confirm = this.state.app.confirm;
      const context = this;

      confirm.title = "Delete project";
      confirm.description = "Are you sure you want to delete this project?";
      confirm.caption = "Delete";
      confirm.confirmClasses = "is-danger";

      confirm.action = () => {
        // await context.vm.deleteProject();
        context.$emit("project-delete");
      };
      confirm.cancel = () => context.$refs.deleteButton.focus();

      confirm.show = true;
    },
    handleDuplicate() {
      const confirm = this.state.app.confirm;
      const context = this;

      confirm.title = "Duplicate project";
      confirm.description = "Are you sure you want to create a duplicate of this project?";
      confirm.caption = "Duplicate";
      confirm.confirmClasses = "is-primary";

      confirm.action = () => {
        // await context.vm.deleteProject();
        context.$emit("project-duplicate");
      };
      confirm.cancel = () => context.$refs.duplicateButton.focus();

      confirm.show = true;
    },
    handlePrd() {
      const confirm = this.state.app.confirm;
      const context = this;

      confirm.title = "Create PRD";
      confirm.description = "Are you sure you want to create a project requirements document (PRD) for this project?";
      confirm.caption = "Create";
      confirm.confirmClasses = "is-primary";

      confirm.action = () => {
        // await context.vm.createProjectPrdLink();
        context.$emit("project-prd-file");
      };
      confirm.cancel = () => context.$refs.prdButton.focus();

      confirm.show = true;
    }
  },

  template: document.querySelector("#project-action-bar-template").innerHTML,
};

app.component("project-action-bar", ProjectActionBar);
</script>