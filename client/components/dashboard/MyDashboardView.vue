<template id="my-dashboard-view-template">
  <main class="p-2">
    <h1 class="title is-6 mb-2 icon-text is-align-items-center">
      <span class="icon is-large">
        <span aria-hidden="true" class="material-symbols-outlined">list_alt</span>
      </span>
      <span> My projects dashboard </span>
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

      <h2 class="subtitle mb-1">
        Favorite projects ({{ vm.favoriteProjects.length }})
      </h2>

      <project-card
        v-for="project in vm.favoriteProjects"
        :key="project.id"
        :project="project"
        class="link-border mb-2"
        :show-owner="false"
        @project-click="handleGoToProject"
      ></project-card>

      <article class="columns p-1 mb-0">
        <section v-if="vm.pendingPastDueItems.length > 0" class="column p-1">
          <h2 class="subtitle mb-1">
            Past due scheduled items ({{ vm.pendingPastDueItems.length }})
          </h2>
          <item-card
            v-for="{ item } in vm.pendingPastDueItems"
            :item="item"
            :key="item.id"
            class="mb-2 danger-border"
            :show-assignee="false"
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
            :show-assignee="false"
            @item-click="handleGoToItem"
            @project-click="handleGoToProjectAndItem"
          ></item-card>
        </section>
      </article>

      <article class="columns p-1 mb-0">
        <section class="column p-1">
          <h2 class="subtitle mb-1">
            Testing items ({{ vm.testingItems.length }})
          </h2>
          <item-card
            v-for="{ item } in vm.testingItems"
            :key="item.id"
            :item="item"
            class="mb-2 success-border"
            :show-assignee="false"
            @item-click="handleGoToItem"
            @project-click="handleGoToProjectAndItem"
          ></item-card>
        </section>

        <section class="column p-1">
          <h2 class="subtitle mb-1">Open items ({{ vm.openItems.length }})</h2>
          <item-card
            v-for="{ item } in vm.openItems"
            :key="item.id"
            :item="item"
            class="mb-2 warning-border"
            :show-assignee="false"
            @item-click="handleGoToItem"
            @project-click="handleGoToProjectAndItem"
          ></item-card>
        </section>
      </article>

      <h2 class="subtitle mb-1 mt-3">
        Active projects ({{ vm.activeProjects.length }})
      </h2>

      <pipeline-board :vm="vm" heading="h3" :show-owner="false"></pipeline-board>
    </section>
  </main>
</template>

<script>
const MyDashboardView = {
  setup() {
    const vm = useDashboardViewModel({ my: true });

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
    handleGoToProject(project) {
      this.$router.push(`/project/${project.id}`);
    },
    handleGoToItem(item) {
      this.$router.push(`/item/${item.id}`);
    },
  },

  template: document.querySelector("#my-dashboard-view-template").innerHTML,
};

app.component("my-dashboard-view", MyDashboardView);
</script>