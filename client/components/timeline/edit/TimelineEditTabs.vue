<template id="timeline-edit-tabs-template">
  <section>
    <div class="sticky-header has-background-white">
      <nav class="tabs is-small force-32-height">
        <ul>
          <li v-focus :class="{ 'is-active': selectedTab === 'details' }">
            <a href="#" @click.prevent="selectTab('details')">Details</a>
          </li>
          <li
            v-show="!vm.isNew"
            :class="{ 'is-active': selectedTab === 'projects' }"
          >
            <a
              href="#"
              @click.prevent="selectTab('projects', { forceResize: true })"
              >Projects</a
            >
          </li>
        </ul>
      </nav>
    </div>

    <timeline-edit-details
      v-show="selectedTab === 'details'"
      class="container p-2 mb-4"
      :vm="vm"
    ></timeline-edit-details>

    <section v-show="selectedTab === 'projects'" class="container">
      <project-card
        v-for="project in vm.projects"
        :key="project.id"
        class="mb-2 is-radiusless highlight-border-bottom"
        :project="project"
        :show-favorite="false"
        :show-owner="true"
        :show-item-stats="true"
        @project-click="handleProjectClick"
      ></project-card>
    </section>
  </section>
</template>

<script>
const TimelineEditTabs = {
  props: {
    vm: Object,
  },

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  mounted() {
    const { currentQueryParams } = this.state.app;

    const tab = currentQueryParams.tab;
    if (!tab) return;

    this.selectTab(tab, { forceResize: true });
  },

  data() {
    return {};
  },

  computed: {
    selectedTab() {
      return this.state.app.currentQueryParams.tab || "details";
    },
  },

  methods: {
    selectTab(tabName, { forceResize = false } = {}) {
      this.$router.replace({
        path: this.state.app.currentRoute,
        query: { tab: String(tabName) },
      });

      if (forceResize)
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    },
    handleProjectClick(project) {
      this.$router.push(`/project/${project.id}`);
    },
  },

  template: document.querySelector("#timeline-edit-tabs-template").innerHTML,
};

app.component("timeline-edit-tabs", TimelineEditTabs);
</script>