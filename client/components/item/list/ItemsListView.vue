<template id="items-list-view-template">
  <main>
    <div class="sticky-header has-background-white">
      <nav class="tabs is-small is-fullwidth force-32-height">
        <ul>
          <li
            v-focus
            :class="{ 'is-active': selectedTab === 'all' }"
          >
            <a
              href="#"
              @click.prevent="selectTab('all')"
            >All</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'mine' }">
            <a
              href="#"
              @click.prevent="selectTab('mine')"
            >Mine</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'priority' }">
            <a
              href="#"
              @click.prevent="selectTab('priority')"
            >High priority</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'pending' }">
            <a
              href="#"
              @click.prevent="selectTab('pending')"
            >Pending</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'testing' }">
            <a
              href="#"
              @click.prevent="selectTab('testing')"
            >Testing</a>
          </li>
        </ul>
      </nav>
    </div>
    <scrollable-hero-table
      v-focus
      header-class="is-white sticky-header has-small-tabs"
      :offset="24"
      :headers="headers"
      :rows="rows"
      :filter-fields="filterFields"
      :filter-dates="filterDates"
      :criteria="criteria"
      :use-worker="true"
      :search-more-options="searchMoreOptions"
      @more-options-action="handleMoreOptionsAction"
      @row-select="handleRowSelect"
    >
      <template #type="row">
        <span class="icon-text is-flex-wrap-nowrap">
          <item-type-icon
            class="is-small"
            icon-class="is-size-6"
            :type="row.item.type"
          ></item-type-icon>
          <span>
            {{ row.item.type }}
          </span>
        </span>
      </template>
      <template #status="row">
        <span
          class="tag"
          :class="row.itemStatusBulmaTag"
        >
          {{ row.item.status }}
        </span>
      </template>
    </scrollable-hero-table>
  </main>
</template>

<script>
const ItemsListView = {
  props: {},

  setup() {
    const { users, itemTypes, itemStatuses, itemTags, priorities } =
      useListFilters();

    return {
      users,
      itemTypes,
      itemStatuses,
      itemTags,
      priorities,
      state: {
        app: store.state.app,
        data: store.state.data,
      },
      calculated: {
        activeProjectItems: store.calculated.activeProjectItems,
      },
      dispatch: {
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
      headers: [
        {
          prop: "itemNumber",
          caption: "#",
        },
        {
          prop: "_projectName",
          caption: "Project",
          style: { 'min-width': '14vw' },
        },
        {
          prop: "_assignee",
          caption: "Assigned to",
        },
        {
          prop: "name",
          caption: "Name",
          style: { 'min-width': '20vw' },
        },
        {
          prop: "description",
          searchOnly: true,
        },
        {
          prop: "type",
          caption: "Type",
        },
        {
          prop: "priority",
          caption: "Priority",
        },
        {
          prop: "status",
          caption: "Status",
        },
        {
          prop: "version",
          caption: "Version",
        },
        {
          prop: "_tagsDisplay",
          caption: "Tags",
        },
        {
          prop: "hours",
          caption: "Hours",
        },
        {
          prop: "resolvedDate",
          caption: "Resolved",
        },
        {
          prop: "closedDate",
          caption: "Closed",
        },
        {
          prop: "_modifiedDate",
          caption: "Modified",
        },
        {
          prop: "_modifiedBy",
          caption: "Modified by",
        },
        {
          prop: "_createdDate",
          caption: "Created",
        },
        {
          prop: "_createdBy",
          caption: "Created by",
        },
        {
          prop: "_search",
          searchOnly: true,
        },
      ],
      filterDates: [
        {
          prop: "_createdDate",
          caption: "Created",
        },
      ],
      criteria: {
        search: "",
        filter: {},
        dates: {},
        sort: {
          header: "itemNumber",
          ascending: false,
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
    selectedTab() {
      return this.state.app.currentQueryParams.tab || "all";
    },
    rows() {
      console.time("items list");
      const removeEmailAt = (email) => String(email).split("@")[0];
      const formatJsonDate = (dt) => String(dt).split("T")[0];

      const items = this.tabRows.map((item) => {
        const vm = useItemViewModel(item);

        return {
          item,
          ...item,
          _rowKey: item.id,
          _tagsDisplay: item.tags.join(" | "),
          _assignee: removeEmailAt(item.assignee),
          _projectName: vm.project ? vm.project.name : "(No project)",
          _createdDate: formatJsonDate(item.createdDate),
          _createdBy: removeEmailAt(item.createdBy),
          _modifiedDate: formatJsonDate(item.modifiedDate),
          _modifiedBy: removeEmailAt(item.modifiedBy),
          _search: vm.comments.map((c) => c.comment).join(" "),
          itemStatusBulmaTag: vm.itemStatusBulmaTag,
          _tags: item.tags,
          item__tags: true
        };
      });

      console.timeEnd("items list");
      return items;
    },
    filterFields() {
      const projectNames = new Set(
        this.state.data.projects.map((project) => project.name)
      );
      const projectOptions = [...projectNames]
        .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
        .map((n) => ({ value: n, text: n }));

      const tab = this.selectedTab;

      let fields = [
        {
          prop: "_projectName",
          options: [
            {
              value: "",
              text: "- Projects -",
            },
            ...projectOptions,
          ],
        },
      ];

      if (tab !== "mine")
        fields.push({
          prop: "assignee",
          options: [
            {
              value: "",
              text: "- Assignees -",
            },
            ...this.users,
          ],
        });

      fields.push({
        prop: "type",
        options: [
          {
            value: "",
            text: "- Types -",
          },
          ...this.itemTypes,
        ],
      });

      if (tab !== "riority")
        fields.push({
          prop: "priority",
          options: [
            {
              value: "",
              text: "- Priorities -",
            },
            ...this.priorities,
          ],
        });

      return [
        ...fields,
        {
          prop: "status",
          options: [
            {
              value: "",
              text: "- Statuses -",
            },
            ...this.itemStatuses,
          ],
        },
        {
          prop: "item__tags",
          options: [
            {
              value: "",
              text: "- Tags -",
            },
            ...this.itemTags,
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
      const tabFilter = (item) => {
        if (tab === "all") return true;

        if (tab === "mine") return item.assignee === userEmail;

        if (tab === "priority")
          return item.priority === "High" || item.priority === "Critical";

        if (tab === "pending")
          return item.status === "New" || item.status === "Open";

        if (tab === "testing") return item.status === "Testing";

        return true;
      };

      const activeProjectItems =
        this.calculated.activeProjectItems.value.filter(tabFilter);

      this.tabRows = activeProjectItems;
    },
    handleRowSelect({ row }) {
      this.$router.push(`/item/${row.item.id}`);
    },
    handleMoreOptionsAction({ action, displayedRows, allRows }) {
      switch (action) {
        case "EXPORT_TO_CSV":
          this.handleExportToCsv(displayedRows);
          break;
      }
    },
    handleExportToCsv(displayedRows) {
      const dataToDownload = displayedRows.map((row) => {
        const obj = {};
        this.headers
          .filter((header) => !header.searchOnly)
          .forEach((header) => (obj[header.caption] = row[header.prop]));
        return obj;
      });

      this.dispatch.util.downloadDataAsCsv(
        `IS-Projects-download_project_data_${new Date().toJSON()}.csv`,
        dataToDownload
      );
    },
  },

  watch: {
    selectedTab(newTab) {
      console.log('SELECTED_TAB.watch'); //DEBUG
      if (!this.state.app.currentRoute.startsWith('/items'))
        return;

      this.updateTabFilteredRows(newTab);

      const criteria = this.criteria;
      const filterFields = this.filterFields;
      requestAnimationFrame(() => {
        criteria.search = "";
        criteria.sort = {
          header: "itemNumber",
          ascending: false,
        };
        filterFields.forEach(({ prop }) => (criteria.filter[prop] = ""));
      });
    },
  },

  template: document.querySelector("#items-list-view-template").innerHTML,
};

app.component("items-list-view", ItemsListView);
</script>