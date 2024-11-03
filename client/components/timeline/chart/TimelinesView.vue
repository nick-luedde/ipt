<template id="timelines-view-template">
  <main>
    <div class="container">
      <section class="columns is-vcentered mb-0 pb-0">
        <apps-select
          class="column is-narrow mb-3"
          label="Status"
          size="is-small"
          :options="['All', ...state.list.timelineStatuses]"
          v-model="filter.status"
          @change="updateRouteQuery({ status: filter.status })"
        ></apps-select>

        <apps-input
          class="column mb-0"
          label="Start date"
          type="date"
          size="is-small"
          v-model="filter.startDate"
          @change="updateRouteQuery({ start: filter.startDate })"
        ></apps-input>

        <apps-input
          class="column mb-0"
          label="End date"
          type="date"
          size="is-small"
          v-model="filter.endDate"
          @change="updateRouteQuery({ end: filter.endDate })"
        ></apps-input>
      </section>

      <section class="pb-3">
        <fieldset>
          <legend class="subtitle is-6 mb-1">Filter by project owners</legend>
          <label class="checkbox">
            <input
              type="checkbox"
              v-model="selectAllOwners"
              @change="handleSelectAllChange"
            />
            All owners
          </label>
          <div class="columns is-multiline">
            <div
              v-for="user in state.list.users"
              :key="user"
              class="column p-0 is-3"
            >
              <label class="checkbox">
                <input
                  type="checkbox"
                  :value="user"
                  v-model="filter.users"
                  @change="handleSelectedUsersChange"
                />
                {{ user }}
              </label>
            </div>
          </div>
        </fieldset>
      </section>
    </div>

    <section class="container p-5">
      <div class="columns is-mobile is-vcentered">
        <div class="column p-0">
          <div class="field">
            <div class="control">
              <div class="select is-small" style="width: 100%">
                <select
                  :value="selectedTimelineIndex"
                  @change="handleTimelineSelect($event.target.value)"
                  style="width: 100%"
                >
                  <option value="">-- Select a timeline --</option>
                  <option
                    v-for="(timeline, index) in filteredTimelines"
                    :key="timeline.id"
                    :value="index"
                  >
                    {{ timeline.name }} ({{ timeline.startDate }} -
                    {{ timeline.endDate }})
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="column is-narrow is-size-7 p-1">
          {{ filteredTimelines.length }} Timelines
        </div>
      </div>

      <!-- <timelines-chart
        :rows="chartRows"
        @timeline-index-select="handleTimelineSelect"
      ></timelines-chart> -->

      <timeline-panel
        v-if="!!selectedTimeline"
        :timeline="selectedTimeline"
      ></timeline-panel>
    </section>
  </main>
</template>

<script>
const TimelinesView = {
  props: {},

  setup() {
    return {
      state: {
        app: store.state.app,
        data: store.state.data,
        list: store.state.list,
      },
      dispatch: {
        timeline: store.dispatch.timeline,
      },
    };
  },

  created() {
    const query = this.$router.currentRoute.value.query;

    const { id, start, end, type } = query;

    if (id)
      this.selectedTimelineIndex = this.filteredTimelines.findIndex(
        (ms) => ms.id === id
      );

    if (start) this.filter.startDate = start;

    if (end) this.filter.endDate = end;
  },

  data() {
    const today = new Date();
    const defaultStartDate = new Date(today);
    const defaultEndDate = new Date(today);

    defaultStartDate.setDate(today.getDate() - 180);
    defaultEndDate.setDate(today.getDate() + 180);

    const [startDate] = defaultStartDate.toJSON().split("T");
    const [endDate] = defaultEndDate.toJSON().split("T");

    return {
      selectedTimelineIndex: "",
      selectAllOwners: true,
      filter: {
        status: "Open",
        users: [],
        startDate,
        endDate,
      },
    };
  },

  computed: {
    selectedTimeline() {
      return this.filteredTimelines[this.selectedTimelineIndex];
    },
    filteredTimelines() {
      const { startDate, endDate, status, users } = this.filter;

      const filtered = this.state.data.timelines
        .filter((ms) => {
          const vm = useTimelineViewModel(ms);

          return (
            (this.selectAllOwners ||
              vm.projects.length === 0 ||
              vm.projects.some((proj) => users.includes(proj.owner))) &&
            (status === "All" || status === ms.status) &&
            (!startDate ||
              !endDate ||
              (startDate >= ms.startDate && startDate <= ms.endDate) ||
              (endDate >= ms.startDate && endDate <= ms.endDate) ||
              (ms.startDate >= startDate && ms.startDate <= endDate) ||
              (ms.endDate >= startDate && ms.endDate <= endDate))
          );
        })
        .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

      return filtered;
    },
    chartRows() {
      const { startDate, endDate } = this.filter;

      return this.filteredTimelines.map((ms) => {
        const rowStart = ms.startDate < startDate ? startDate : ms.startDate;
        const rowEnd = ms.endDate > endDate ? endDate : ms.endDate;

        return {
          timeline: ms.name,
          startDate: new Date(rowStart),
          endDate: new Date(rowEnd),
        };
      });
    },
  },

  methods: {
    handleSelectAllChange() {
      if (this.selectAllOwners) this.filter.users = [];
    },
    handleSelectedUsersChange() {
      this.selectAllOwners = this.filter.users.length === 0;
    },
    handleTimelineSelect(timelineIndex) {
      this.selectedTimelineIndex = null;

      const timeline = this.filteredTimelines[timelineIndex];

      // chart.setSelection does not currently work for timeline chart :(
      // see https://github.com/google/google-visualization-issues/issues/2357
      // this.chart.setSelection([{ row: selectionIndex, column: undefined }]);

      this.updateRouteQuery({ id: timeline ? timeline.id : "" });
      this.$nextTick().then(
        () => (this.selectedTimelineIndex = timelineIndex)
      );
    },
    updateRouteQuery(options) {
      const currentQuery = this.$router.currentRoute.value.query;

      this.$router.replace({
        path: this.state.app.currentRoute,
        query: {
          ...currentQuery,
          ...options,
        },
      });
    },
  },

  template: document.querySelector("#timelines-view-template")
    .innerHTML,
};

app.component("timelines-view", TimelinesView);
</script>