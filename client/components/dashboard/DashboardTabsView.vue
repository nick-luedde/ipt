<template id="dashboardTabsView-template">
  <section>
    <div class="sticky-header has-background-white">
      <nav class="tabs is-small is-fullwidth force-32-height">
        <ul>
          <li v-focus :class="{ 'is-active': selectedTab === 'my' }">
            <a href="#" @click.prevent="selectTab('my')">My dashboard</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'team' }">
            <a href="#" @click.prevent="selectTab('team')">Team dashboard</a>
          </li>
          <li :class="{ 'is-active': selectedTab === 'pipeline' }">
            <a href="#" @click.prevent="selectTab('pipeline')"
              >Pipeline dashboard</a
            >
          </li>
          <!-- <li :class="{ 'is-active': selectedTab === 'accessibility' }">
            <a href="#" @click.prevent="selectTab('accessibility')"
              >Accessibility dashboard</a
            >
          </li> -->
        </ul>
      </nav>
    </div>

    <keep-alive>
      <my-dashboard-view v-if="selectedTab === 'my'"></my-dashboard-view>
    </keep-alive>

    <keep-alive>
      <team-dashboard-view
        v-if="selectedTab === 'team'"
      ></team-dashboard-view>
    </keep-alive>

    <keep-alive>
      <pipeline-dashboard-view
        v-if="selectedTab === 'pipeline'"
      ></pipeline-dashboard-view>
    </keep-alive>

    <!-- <keep-alive>
      <accessibility-dashboard-view
        v-if="selectedTab === 'accessibility'"
      ></accessibility-dashboard-view>
    </keep-alive> -->
  </section>
</template>

<script>
const DashboardTabsView = {
  props: {},

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  data() {
    return {};
  },

  computed: {
    selectedTab() {
      return this.state.app.currentQueryParams.tab || "my";
    },
  },

  methods: {
    selectTab(tabName) {
      this.$router.replace({
        path: this.state.app.currentRoute,
        query: { tab: String(tabName) },
      });
    },
  },

  template: document.querySelector("#dashboardTabsView-template").innerHTML,
};

app.component("dashboardTabsView", DashboardTabsView);
</script>