<template id="project-edit-details-template">
  <section>
    <project-stats :vm="vm"></project-stats>
    <hr />

    <apps-input
      label="Name"
      size="is-small"
      :schema="vm.validation.schema.name"
      v-model="vm.project.name"
      @input="vm.autosave"
    ></apps-input>

    <apps-input
      label="Description"
      size="is-small"
      :schema="vm.validation.schema.description"
      v-model="vm.project.description"
      @input="vm.autosave"
    ></apps-input>

    <div class="columns">
      <div class="column p-1">
        <apps-tags
          label="Platform"
          size="is-small"
          placeholder="New platform..."
          icon-left="add"
          :suggestions="platformSuggestions"
          :schema="vm.validation.schema.platforms"
          v-model="vm.project.platforms"
          @change="vm.autosave"
        ></apps-tags>

        <apps-tags
          label="Category"
          size="is-small"
          placeholder="New category..."
          icon-left="add"
          :suggestions="categorySuggestions"
          :schema="vm.validation.schema.categories"
          v-model="vm.project.categories"
          @change="vm.autosave"
        ></apps-tags>

        <apps-select
          label="Priority"
          size="is-small"
          fullwidth
          :options="state.list.priorities"
          :schema="vm.validation.schema.priority"
          v-model="vm.project.priority"
          @input="vm.autosave"
        ></apps-select>

        <apps-select
          label="Program"
          size="is-small"
          fullwidth
          :options="state.list.projectPrograms"
          :schema="vm.validation.schema.program"
          v-model="vm.project.program"
          @change="vm.autosave"
        ></apps-select>

        <apps-checkbox
          label="Contains PII"
          size="is-small"
          :schema="vm.validation.schema.hasPII"
          v-model="vm.project.hasPII"
          @change="vm.autosave"
        ></apps-checkbox>

        <apps-checkbox
          label="Is public for support requests"
          size="is-small"
          :schema="vm.validation.schema.isPublic"
          v-model="vm.project.isPublic"
          @change="vm.autosave"
        ></apps-checkbox>

        <p class="subtitle is-6 mb-1">Project links</p>
        <project-links-edit
          class="mb-2 mt-2"
          :vm="vm"
        ></project-links-edit>
      </div>

      <div class="column p-1">
        <apps-input
          label="Version"
          size="is-small"
          :schema="vm.validation.schema.version"
          :model-value="vm.project.version"
          @change="handleUpdateVersion"
        ></apps-input>

        <apps-select
          label="Accessibility status"
          size="is-small"
          fullwidth
          :options="state.list.accessibilityStatuses"
          :schema="vm.validation.schema.accessibilityStatus"
          v-model="vm.project.accessibilityStatus"
          @change="vm.autosave"
        ></apps-select>

        <apps-select
          label="Status"
          size="is-small"
          fullwidth
          :options="state.list.projectStatuses"
          :schema="vm.validation.schema.status"
          v-model="vm.project.status"
          @change="vm.autosave"
        ></apps-select>

        <apps-select
          label="Owner"
          size="is-small"
          icon-left="person"
          fullwidth
          :options="users"
          :schema="vm.validation.schema.owner"
          v-model="vm.project.owner"
          @change="vm.autosave"
        ></apps-select>

        <apps-select
          label="Backup"
          size="is-small"
          icon-left="people"
          fullwidth
          :options="users"
          :schema="vm.validation.schema.backup"
          v-model="vm.project.backup"
          @change="vm.autosave"
        ></apps-select>

        <apps-input
          label="Project iteration target"
          size="is-small"
          :schema="vm.validation.schema.iteration"
          v-model="vm.project.iteration"
          @input="vm.autosave"
        ></apps-input>

        <apps-input
          label="Planning notes"
          size="is-small"
          :schema="vm.validation.schema.planningNotes"
          v-model="vm.project.planningNotes"
          @input="vm.autosave"
        ></apps-input>
      </div>
    </div>

    <h2 class="title is-6 mb-1">Dependencies</h2>
    <hr class="mb-4" />

    <div class="columns">
      <div class="column p-1">
        <depends-on-projects :vm="vm"></depends-on-projects>
      </div>

      <div class="column p-1">
        <dependent-for-projects :vm="vm"></dependent-for-projects>
      </div>
    </div>

    <project-dependency-layers :vm="dependencyVm"></project-dependency-layers>
  </section>
</template>

<script>
const ProjectEditDetails = {
  props: {
    vm: Object,
  },

  setup(props) {
    const { computed } = Vue;
    const dependencyVm = useProjectDependencyViewModel(props.vm.project);

    const { projectPlatforms, projectCategories } = useListFilters();
    const platformSuggestions = computed(() => projectPlatforms.value.map(t => t.value));
    const categorySuggestions = computed(() => projectCategories.value.map(t => t.value));

    return {
      dependencyVm,
      platformSuggestions,
      categorySuggestions,
      state: {
        app: store.state.app,
        data: store.state.data,
        list: store.state.list,
      },
    };
  },

  data() {
    return {};
  },

  computed: {
    users() {
      return this.state.list.users;
    },
  },

  methods: {
    handleUpdateVersion(newVersion) {
      const confirm = this.state.app.confirm;
      const context = this;
      if (!newVersion || newVersion === this.vm.project.version) return;

      if (!this.vm.isValid) {
        this.state.app.errorMessage =
          "Cannot update version until all required fields are provided! Set all required project fields and then try again.";

        const current = this.vm.project.version;
        this.vm.project.version = "";
        this.$nextTick().then(() => (this.vm.project.version = current));

        return;
      }

      confirm.title = "Update project version";
      confirm.description = `Are you sure you want to update the project version to ${newVersion}?
This will also update all outstanding project items to version ${newVersion}`;
      confirm.caption = "Update";
      confirm.confirmClasses = "is-success";

      confirm.action = async () => {
        await context.vm.updateProjectVersion(newVersion);
      };

      confirm.cancel = () =>
        (context.vm.project.version = context.vm.project.version);

      confirm.show = true;
    },
  },

  template: document.querySelector("#project-edit-details-template").innerHTML,
};

app.component("project-edit-details", ProjectEditDetails);
</script>