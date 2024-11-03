<template id="team-dashboard-view-template">
  <main class="p-2">
    <h1 class="title is-6 mb-2 icon-text is-align-items-center">
      <span class="icon is-large">
        <span aria-hidden="true" class="material-symbols-outlined">dashboard</span>
      </span>
      <span> Team dashboard </span>
    </h1>

    <!-- <items-pie-chart
      :items="vm.items.map(({ item }) => item)"
    ></items-pie-chart> -->

    <article class="columns p-1">
      <div class="column p-1 has-text-centered light-border">
        <p class="subtitle">Total projects</p>
        {{ vm.stats.totalProjects }}
      </div>
      <div class="column p-1 has-text-centered light-border">
        <p class="subtitle">Total items</p>
        {{ vm.stats.totalItems }}
      </div>

      <div class="column p-1 has-text-centered light-border">
        <p class="subtitle">Pending items</p>
        {{ vm.stats.pendingItems }}
      </div>

      <div class="column p-1 has-text-centered light-border">
        <p class="subtitle">Closed items</p>
        {{ vm.stats.closedItems }}
      </div>

      <div class="column p-1 has-text-centered light-border">
        <p class="subtitle">Complete percent</p>
        {{ vm.stats.completePercent }}
      </div>
    </article>

    <article class="columns is-multiline is-vcentered pt-5">
      <div v-for="wvm in vm.workloadVms" :key="wvm.email" class="column is-3">
        <workload-card class="light-border" :vm="wvm"></workload-card>
      </div>
    </article>

    <article class="columns mb-0">
      <section v-if="vm.pendingPastDueItems.length > 0" class="column p-1">
        <h2 class="subtitle mb-1">Past due scheduled items</h2>
        <item-card
          v-for="{ item } in vm.pendingPastDueItems"
          :item="item"
          :key="item.id"
          class="mb-2 danger-border"
          @item-click="handleGoToItem"
          @project-click="handleGoToProject"
        ></item-card>
      </section>

      <section class="column p-1">
        <h2 class="subtitle mb-1">
          Upcoming scheduled items ({{ vm.pendingScheduledItems.length }})
        </h2>
        <item-card
          v-for="{ item } in vm.pendingScheduledItems"
          :key="item.id"
          :item="item"
          class="mb-2"
          @item-click="handleGoToItem"
          @project-click="handleGoToProject"
        ></item-card>
      </section>
    </article>
  </main>
</template>

<script>
const TeamDashboardView = {
  setup() {
    const vm = useDashboardViewModel({ team: true });

    return {
      vm,
    };
  },

  methods: {
    handleGoToProject({ project }) {
      this.$router.push(`/project/${project.id}`);
    },
    handleGoToItem(item) {
      this.$router.push(`/item/${item.id}`);
    },
    formatScheduledDate(scheduled) {
      const d = new Date(scheduled);
      return d.toLocaleDateString();
    },
  },

  template: document.querySelector("#team-dashboard-view-template").innerHTML,
};

app.component("team-dashboard-view", TeamDashboardView);
</script>