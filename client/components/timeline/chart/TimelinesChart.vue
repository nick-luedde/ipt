<template id="timelines-chart-template">
  <section class="columns mb-2">
    <article class="column is-12 p-0">
      <figure v-show="rows.length > 0" ref="chart"></figure>
      <h1 v-show="rows.length === 0" class="title pt-5">No Timelines found!</h1>
    </article>
    <!-- hack to force dataTable reactivity -->
    <div aria-hidden="true" v-show="false">
      {{ dataTable.getNumberOfRows() }}
    </div>
  </section>
</template>

<script>
const TimelinesTimelineChart = {
  props: {
    rows: Array,
  },

  emits: ["timeline-index-select"],

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  mounted() {
    // Load the Visualization API and the timeline package.
    google.charts.load("current", { packages: ["timeline"] });
    google.charts.setOnLoadCallback(this.renderChart);

    window.addEventListener("resize", this.redrawChart);
  },

  unmounted() {
    window.removeEventListener("resize", this.redrawChart);
  },

  data() {
    return {
      drawChart: null,
      chart: null,
    };
  },

  computed: {
    dataTable() {
      const dataTable = new google.visualization.DataTable();
      
      // see https://developers.google.com/chart/interactive/docs/gallery/timeline#data-format
      dataTable.addColumn({ type: "string", id: "Timeline" });
      // dataTable.addColumn({ type: "string", id: "no-use-bar-label" });
      // dataTable.addColumn({ type: "string", role: "tooltip" });
      dataTable.addColumn({ type: "date", id: "Start" });
      dataTable.addColumn({ type: "date", id: "End" });

      const rows = this.rows.map((ms) => [
        ms.timeline,
        // null,
        // ms.tooltip,
        ms.startDate,
        ms.endDate,
      ]);

      dataTable.addRows(rows);

      this.$nextTick().then(() => this.redrawChart());
      return dataTable;
    },
    chartOptions() {
      const ROW_HEIGHT_PX = 41;
      const height = ROW_HEIGHT_PX * this.rows.length + 65;

      const user = this.state.app.user;
      const fontColor =
        user && user.settings.theme === "Dark" ? "#ffffff" : "#171717";
      const backgroundColor =
        user && user.settings.theme === "Light" ? "#ffffff" : "#171717";

      return {
        alternatingRowStyle: false,
        backgroundColor: backgroundColor,
        height,
        animation: {
          startup: true,
          duration: 1000,
          easing: "out",
        },
        timeline: {
          // showRowLabels: false,
          rowLabelStyle: {
            color: fontColor,
          },
        },
        // currently not supported for Timeline charts, but left for future reference
        hAxis: {
          textStyle: {
            color: fontColor,
          },
        },
      };
    },
  },

  methods: {
    renderChart() {
      const container = this.$refs.chart;
      container.innerHTML = "";

      const chart = new google.visualization.Timeline(container);

      // https://stackoverflow.com/questions/52156120/google-charts-change-color-of-x-axis-font-for-timelines
      google.visualization.events.addListener(chart, "ready", () => {
        const axisLabels = container.getElementsByTagName("text");
        [...axisLabels].forEach(
          (label) =>
            label.setAttribute(
              "fill",
              this.chartOptions.timeline.rowLabelStyle.color
            )
        );
      });

      google.visualization.events.addListener(chart, "select", () => {
        const [selected] = chart.getSelection();
        this.$emit("timeline-index-select", selected.row);
      });

      this.chart = chart;
      this.drawChart = () => {
        if (this.rows.length === 0) chart.clearChart();
        else chart.draw(this.dataTable, this.chartOptions);
      };

      if (this.rows.length > 0) this.drawChart();
    },
    redrawChart() {
      if (this.drawChart) this.drawChart();
    },
  },

  template: document.querySelector("#timelines-chart-template")
    .innerHTML,
};

app.component("timelines-chart", TimelinesTimelineChart);
</script>