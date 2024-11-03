<template id="pipeline-dashboard-view-template">
  <main class="p-2">
    <h1 class="title is-6 mb-2 icon-text is-align-items-center">
      <span class="icon is-large">
        <span aria-hidden="true" class="material-symbols-outlined">timeline</span>
      </span>
      <span> Pipeline dashboard </span>
    </h1>

    <section class="pb-5">
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
                v-model="vm.selectedUsers"
                @change="handleSelectedUsersChange"
              />
              {{ user }}
            </label>
          </div>
        </div>
      </fieldset>
    </section>

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

    <pipeline-board :vm="vm"></pipeline-board>
  </main>
</template>

<script>
const PipelineDashboardView = {
  setup() {
    const vm = useDashboardViewModel({ team: true });

    return {
      state: {
        list: store.state.list,
      },
      vm,
    };
  },

  data() {
    return {
      selectAllOwners: true,
    };
  },

  methods: {
    handleSelectAllChange() {
      if (this.selectAllOwners) this.vm.selectedUsers = [];
    },
    handleSelectedUsersChange() {
      if (this.vm.selectedUsers.length > 0) this.selectAllOwners = false;
    },
  },

  template: document.querySelector("#pipeline-dashboard-view-template")
    .innerHTML,
};

app.component("pipeline-dashboard-view", PipelineDashboardView);
</script>