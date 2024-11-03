<template id="accessibility-dashboard-view-template">
  <main class="p-2">
    <h1 class="title is-6 mb-2 icon-text is-align-items-center">
      <span class="icon is-large">
        <span aria-hidden="true" class="material-symbols-outlined">accessibility</span>
      </span>
      <span> Accessibility dashboard </span>
    </h1>

    <section>
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
      <hr />

      <article class="columns mb-0">
        <section v-if="vm.pendingPastDueItems.length > 0" class="column p-1">
          <h2 class="subtitle mb-1">Past due scheduled items</h2>
          <item-card
            v-for="{ item } in vm.pendingPastDueItems"
            :item="item"
            :key="item.id"
            class="mb-2 danger-border"
            @item-click="handleGoToItem"
            @project-click="handleGoToProjectAndItem"
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
            @project-click="handleGoToProjectAndItem"
          ></item-card>
        </section>
      </article>

      <pipeline-board :vm="vm" heading="h3"></pipeline-board>
    </section>
  </main>
</template>

<script>
const AccessibilityDashboardView = {
  setup() {
    const vm = useAccessibilityDashboardViewModel();
    return {
      vm,
    };
  },

  methods: {
    handleGoToProjectAndItem({ project, item }) {
      this.$router.push({
        path: `/project/${project.id}`,
        query: {
          tab: item.id
        }
      });
    },
    handleGoToItem(item) {
      this.$router.push(`/item/${item.id}`);
    },
    formatScheduledDate(scheduled) {
      const d = new Date(scheduled);
      return d.toLocaleDateString();
    },
  },

  template: document.querySelector("#accessibility-dashboard-view-template")
    .innerHTML,
};

app.component("accessibility-dashboard-view", AccessibilityDashboardView);
</script>