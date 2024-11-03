<template id="timelines-list-view-template">
  <main>
    <scrollable-hero-table
      v-focus
      :offset="24"
      :headers="headers"
      :rows="rows"
      :filter-fields="filterFields"
      :criteria="criteria"
      :use-worker="true"
      :search-more-options="searchMoreOptions"
      @more-options-action="handleMoreOptionsAction"
      @row-select="handleRowSelect"
    >
      <template #status="row">
        <span class="tag" :class="row.statusBulmaTag">
          {{ row.timeline.status }}
        </span>
      </template>
    </scrollable-hero-table>
  </main>
</template>

<script>
const TimelinesListView = {
  props: {},

  setup() {
    const { timelineStatuses } = useListFilters();
    return {
      timelineStatuses,
      state: {
        data: store.state.data,
      },
      dispatch: {
        util: store.dispatch.util,
      },
    };
  },

  data() {
    return {
      headers: [
        {
          prop: "name",
          caption: "Name",
        },
        {
          prop: "startDate",
          caption: "Start date",
        },
        {
          prop: "endDate",
          caption: "End date",
        },
        {
          prop: "status",
          caption: "Status",
        },
        {
          prop: "description",
          caption: "Description",
        },
        {
          prop: "_complexity",
          caption: "Complexity index",
        },
        {
          prop: "effort",
          caption: "Effort",
        },
        {
          prop: "priority",
          caption: "Priority",
        },
        {
          prop: "magnitude",
          caption: "Magnitude",
        },
        {
          prop: "_impacts",
          caption: "Impacts",
        },
        {
          prop: "_search",
          searchOnly: true,
        },
      ],
      filterFields: [
        {
          prop: "status",
          options: [
            {
              value: "",
              text: "Statuses"
            },
            ...this.timelineStatuses
          ],
        },
      ],
      criteria: {
        search: "",
        filter: {},
        dates: {},
        sort: {
          header: "startDate",
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
    rows() {
      return this.state.data.timelines.map((timeline) => {
        const vm = useTimelineViewModel(timeline);

        return {
          timeline,
          statusBulmaTag: vm.statusBulmaTag,
          _complexity: vm.complexityIndex,
          _impacts: vm.timeline.impacts.join(", "),
          _search: `${vm.timeline.notes}`,
          ...timeline,
        };
      });
    },
  },

  methods: {
    handleRowSelect({ row }) {
      this.$router.push(`/timeline/${row.timeline.id}`);
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

  template: document.querySelector("#timelines-list-view-template").innerHTML,
};

app.component("timelines-list-view", TimelinesListView);
</script>