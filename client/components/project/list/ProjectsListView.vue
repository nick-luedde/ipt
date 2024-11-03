<template id="projects-list-view-template">
  <main>
    <div class="sticky-header has-background-white">
      <nav class="tabs is-small is-fullwidth force-32-height">
        <ul>
          <li v-focus :class="{ 'is-active': selectedTab === 'all' }">
            <a href="#" @click.prevent="selectTab('all')">All</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'mine' }">
            <a href="#" @click.prevent="selectTab('mine')">Mine</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'planning' }">
            <a href="#" @click.prevent="selectTab('planning')">Planning</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'development' }">
            <a href="#" @click.prevent="selectTab('development')"
              >Development</a
            >
          </li>
          <li :class="{ 'is-active': selectedTab === 'testing' }">
            <a href="#" @click.prevent="selectTab('testing')">Testing</a>
          </li>
        </ul>
      </nav>
    </div>

    <hero-slot-table
      v-focus
      header-class="is-white sticky-header has-small-tabs"
      :sizes="sizes"
      :headers="headers"
      :rows="rows"
      :filter-fields="filterFields"
      :filter-dates="filterDates"
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
  </main>
</template>

<script>
const ProjectsListView = {
  props: {},

  setup() {
    const {
      users,
      projects,
      priorities,
      projectStatuses,
      projectPrograms,
      projectPlatforms,
      projectCategories,
      accessibilityStatuses,
    } = useListFilters();

    return {
      listFilters: {
        users,
        projects,
        priorities,
        projectStatuses,
        projectPrograms,
        projectPlatforms,
        projectCategories,
        accessibilityStatuses,
      },
      state: {
        app: store.state.app,
      },
      calculated: {
        activeProjects: store.calculated.activeProjects,
      },
      dispatch: {
        project: store.dispatch.project,
        util: store.dispatch.util,
      },
    };
  },

  mounted() {
    this.updateTabFilteredRows(this.selectedTab);
  },

  data() {
    return {
      tabRows: [],
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
          visibility: "is-hidden-touch",
        },
        {
          prop: "_openItems",
          caption: "Pending items",
          visibility: "is-hidden-touch",
        },
        {
          prop: "status",
          caption: "Status",
        },
        {
          prop: "createdDate",
          caption: "Created",
        },
        {
          prop: "_textSearch",
          searchOnly: true,
        },
      ],
      filterDates: [
        {
          prop: 'createdDate',
          caption: 'Created'
        }
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
          caption: "Create new project",
          action: "CREATE_NEW_PROJECT",
        },
        {
          caption: "Export to csv",
          action: "EXPORT_TO_CSV",
        },
      ],
    };
  },

  computed: {
    selectedTab() {
      return this.state.app.currentQueryParams.tab || "all";
    },
    rows() {
      console.time("project rows");

      const projects = this.tabRows.map((project) => {
        const vm = useProjectViewModel(project);

        return {
          project,
          ...project,
          _rowKey: project.id,
          _totalItems: vm.stats.totalItems,
          _openItems: vm.stats.pendingItems,
          _hasPII: vm.project.hasPII ? "true" : "false",
          _isPublic: vm.project.isPublic ? "true" : "false",
          project__platforms: true,
          project__categories: true,
          project__dependsOn: true,
          project__dependentFor: true,
          _textSearch: `${project.description} ${project.platforms.join(
            " "
          )} ${project.categories.join(" ")} ${project.program}`,
        };
      });

      console.timeEnd("project rows");
      return projects;
    },
    filterFields() {
      let fields = [];
      const tab = this.selectedTab;

      if (tab !== "mine")
        fields.push({
          prop: "owner",
          options: [
            {
              value: "",
              text: "- Owners -",
            },
            ...this.listFilters.users.value,
          ],
        });

      if (!["planning", "development", "testing"].includes(tab))
        fields.push({
          prop: "status",
          options: [
            {
              value: "",
              text: "- Statuses -",
            },
            ...this.listFilters.projectStatuses.value,
          ],
        });

      return [
        ...fields,
        {
          prop: "priority",
          options: [
            {
              value: "",
              text: "- Priorities -",
            },
            ...this.listFilters.priorities.value,
          ],
        },
        {
          prop: "project__platforms",
          options: [
            {
              value: "",
              text: "- Platforms -",
            },
            ...this.listFilters.projectPlatforms.value,
          ],
        },
        {
          prop: "project__categories",
          options: [
            {
              value: "",
              text: "- Categories -",
            },
            ...this.listFilters.projectCategories.value,
          ],
        },
        {
          prop: "accessibilityStatus",
          options: [
            {
              value: "",
              text: "- Accessibility statuses -",
            },
            ...this.listFilters.accessibilityStatuses.value,
          ],
        },
        {
          prop: "program",
          options: [
            {
              value: "",
              text: "- Programs -",
            },
            ...this.listFilters.projectPrograms.value,
          ],
        },
        {
          prop: "project__dependsOn",
          options: [
            {
              value: "",
              text: "- Depends on projects -",
            },
            ...this.listFilters.projects.value,
          ],
        },
        {
          prop: "project__dependentFor",
          options: [
            {
              value: "",
              text: "- Dependent for projects -",
            },
            ...this.listFilters.projects.value,
          ],
        },
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
        {
          prop: "_isPublic",
          options: [
            {
              value: "",
              text: "- Public/support status -",
            },
            {
              value: "true",
              text: "Is public for support requests",
            },
            {
              value: "false",
              text: "Is not public for support",
            },
          ],
        },
      ];
    },
  },

  methods: {
    selectTab(tabName) {
      this.$router.replace({
        path: this.state.app.currentRoute,
        query: { tab: String(tabName) },
      });
    },
    updateTabFilteredRows(tab) {
      const userEmail = this.state.app.user && this.state.app.user.email;
      const tabFilter = (project) => {
        if (tab === "all") return true;

        if (tab === "mine") return project.owner === userEmail;

        if (tab === "planning") return project.status === "Planning";

        if (tab === "development") return project.status === "Development";

        if (tab === "testing")
          return (
            project.status === "System testing" || project.status === "UAT"
          );

        return true;
      };

      const projects = this.calculated.activeProjects.value.filter(tabFilter);

      this.tabRows = projects;
    },
    handleGoToProject(project) {
      this.$router.push(`/project/${project.id}`);
    },
    handleCreateNewProject() {
      const route = this.dispatch.project.getNewProjectRoute();
      this.$router.push(route);
    },
    handleMoreOptionsAction({ action, displayedRows, allRows }) {
      switch (action) {
        case "EXPORT_TO_CSV":
          this.handleExportToCsv(displayedRows);
          break;

        case "CREATE_NEW_PROJECT":
          this.handleCreateNewProject();
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
  },

  watch: {
    selectedTab(newTab) {
      this.updateTabFilteredRows(newTab);

      const criteria = this.criteria;
      const filterFields = this.filterFields;
      requestAnimationFrame(() => {
        criteria.search = "";
        criteria.sort = {
          header: "name",
          ascending: true,
        };
        filterFields.forEach(({ prop }) => (criteria.filter[prop] = ""));
      });
    },
  },

  template: document.querySelector("#projects-list-view-template").innerHTML,
};

app.component("projects-list-view", ProjectsListView);
</script>