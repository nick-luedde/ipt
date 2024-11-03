<template id="workload-card-template">
  <article>
    <h2
      class="
        title
        is-6
        mb-1
        p-2
        highlight-border-bottom
      "
    >
      {{ vm.username }}
    </h2>

    <div class="pb-3 pr-3 pl-3 pt-1">
      <p>Active projects: {{ vm.workload.activeProjects }}</p>
      <p>Active project items: {{ vm.workload.activeProjectItems }}</p>
    </div>
  </article>
</template>

<script>
const WorkloadCard = {
  props: {
    vm: Object,
  },

  setup() {
    return {};
  },

  template: document.querySelector("#workload-card-template").innerHTML,
};

app.component("workload-card", WorkloadCard);
</script>