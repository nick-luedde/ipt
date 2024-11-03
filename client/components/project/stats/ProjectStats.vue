<template id="project-stats-template">
  <article class="columns mb-0 is-mobile">
    <div class="column p-1 has-text-centered">
      <p class="subtitle">Total items</p>
      {{ vm.stats.totalItems }}
    </div>

    <div class="column p-1 has-text-centered">
      <p class="subtitle">Pending items</p>
      {{ vm.stats.pendingItems }}
    </div>

    <div class="column p-1 has-text-centered">
      <p class="subtitle">Closed items</p>
      {{ vm.stats.closedItems }}
    </div>

    <div class="column p-1 has-text-centered">
      <p class="subtitle">Complete percent</p>
      {{ vm.stats.completePercent }}
    </div>
  </article>
</template>

<script>
const ProjectStats = {
  props: {
    vm: Object,
  },

  template: document.querySelector("#project-stats-template").innerHTML,
};

app.component("project-stats", ProjectStats);
</script>