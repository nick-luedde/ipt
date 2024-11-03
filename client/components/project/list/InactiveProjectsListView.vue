<template id="inactive-projects-list-view-template">
  <hero-slot-table
    v-focus
    title="Inactive projects"
    header-class="is-white sticky-header"
    :sizes="sizes"
    :headers="headers"
    :rows="rows"
    :filter-fields="filterFields"
    :criteria="criteria"
    :use-worker="true"
    :search-more-options="searchMoreOptions"
    @more-options-action="handleMoreOptionsAction"
  >
    <template v-slot="row">
      <project-card 
        :project="row.project"
        class="mb-2 light-border"
        :show-description="true"
        @project-click="handleGoToProject"
      ></project-card>
    </template>
  </hero-slot-table>
</template>

<script>
const InactiveProjectsListView = {
  props: {},

  setup() {
    return {
      calculated: {
        inactiveProjects: store.calculated.inactiveProjects,
      },
      dispatch: {
        util: store.dispatch.util,
      },
    };
  },

  data() {
    return {
      sizes: ["", "", "", "", ""],
      headers: [
        {
          prop: "name",
          caption: "Name",
        },
        {
          prop: "owner",
          caption: "Project lead",
        },
        {
          prop: "_totalItems",
          caption: "Total items",
        },
        {
          prop: "_openItems",
          caption: "Pending items",
        },
        {
          prop: "status",
          caption: "Status",
        },
        {
          prop: "_textSearch",
          searchOnly: true,
        },
      ],
      filterFields: [
        {
          prop: "_hasPII",
          options: [
            {
              value: "",
              text: "- PII status -",
            },
            {
              value: "true",
              text: "Contains PII",
            },
            {
              value: "false",
              text: "Does not contain PII",
            },
          ],
        },
      ],
      criteria: {
        search: "",
        filter: {},
        dates: {},
        sort: {
          header: "name",
          ascending: true,
        },
      },
      searchMoreOptions: [
        {
          caption: "Export to csv",
          action: "EXPORT_TO_CSV",
        },
      ],
    };
  },

  computed: {
    rows() {
      const inactiveProjects = this.calculated.inactiveProjects.value.map(
        (project) => {
          const vm = useProjectViewModel(project);

          return {
            project,
            ...project,
            _rowKey: project.id,
            _totalItems: vm.stats.totalItems,
            _openItems: vm.stats.pendingItems,
            _hasPII: vm.project.hasPII ? "true" : "false",
          };
        }
      );
      return inactiveProjects;
    },
  },

  methods: {
    handleMoreOptionsAction({ action, displayedRows, allRows }) {
      switch (action) {
        case "EXPORT_TO_CSV":
          this.handleExportToCsv(displayedRows);
          break;
      }
    },
    handleExportToCsv(rows) {
      const dataToDownload = rows.map((row) => row.project);

      this.dispatch.util.downloadDataAsCsv(
        `IS-Projects-download_project_data_${new Date().toJSON()}.csv`,
        dataToDownload
      );
    },
    handleGoToProject(project) {
      this.$router.push(`/project/${project.id}`);
    },
  },

  template: document.querySelector("#inactive-projects-list-view-template")
    .innerHTML,
};

app.component("inactive-projects-list-view", InactiveProjectsListView);
</script>