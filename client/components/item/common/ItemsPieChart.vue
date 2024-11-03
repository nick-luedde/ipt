<template id="items-pie-chart-template">
  <article>
    <div class="is-flex is-justify-content-center">
      <div class="select is-small">
        <select
          aria-label="Chart breakdown"
          v-model="breakdown"
          @change="renderChart"
        >
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="type">Type</option>
        </select>
      </div>
    </div>
    <figure ref="chart"></figure>
  </article>
</template>

<script>
const ItemsPieChart = {
  props: {
    items: Array,
  },

  setup() {
    const { list } = store.state;

    const breakdowns = {
      type: {
        title: "Items by type",
        column: "Type",
        prop: "type",
        options: () => list.types,
      },
      priority: {
        title: "Items by priority",
        column: "Priority",
        prop: "priority",
        options: () => list.priorities,
      },
      status: {
        title: "Items by status",
        column: "Status",
        prop: "status",
        options: () => list.statuses,
      },
    };

    return {
      breakdowns,
      state: {
        app: store.state.app,
        list: store.state.list,
      },
    };
  },

  mounted() {
    // Load the Visualization API and the corechart package.
    google.charts.load("current", { packages: ["corechart"] });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(this.renderChart);

    window.addEventListener("resize", this.redrawChart);
  },

  unmounted() {
    window.removeEventListener("resize", this.redrawChart);
  },

  data() {
    return {
      breakdown: "status",
      drawChart: null,
    };
  },

  methods: {
    renderChart() {
      const table = new google.visualization.DataTable();
      const bd = this.breakdowns[this.breakdown] || this.breakdowns.type;

      table.addColumn("string", bd.column);
      table.addColumn("number", "Total");

      const rows = bd
        .options()
        .map((opt) => [
          opt,
          this.items.filter((item) => item[bd.prop] === opt).length,
        ]);

      table.addRows(rows);

      const user = this.state.app.user;
      const fontColor = (user && user.settings.theme === "Dark") ? "#ffffff" : "#333333";

      const options = {
        title: bd.title,
        backgroundColor: "transparent",
        animation: {
          startup: true,
          duration: 1000,
          easing: 'out'
        },
        titleTextStyle: {
          color: fontColor,
        },
        hAxis: {
          textStyle: {
            color: fontColor,
          },
          titleTextStyle: {
            color: fontColor,
          },
        },
        vAxis: {
          textStyle: {
            color: fontColor,
          },
          titleTextStyle: {
            color: fontColor,
          },
        },
        legend: {
          textStyle: {
            color: fontColor,
          },
        },
      };

      const chartContainer = this.$refs.chart;
      chartContainer.innerHTML = "";

      const chart = new google.visualization.PieChart(chartContainer);
      chart.draw(table, options);
      this.drawChart = () => chart.draw(table, options);
    },
    redrawChart() {
      if (this.drawChart) this.drawChart();
    },
  },

  watch: {
    items() {
      this.renderChart();
    },
  },

  template: document.querySelector("#items-pie-chart-template").innerHTML,
};

app.component("items-pie-chart", ItemsPieChart);
</script>