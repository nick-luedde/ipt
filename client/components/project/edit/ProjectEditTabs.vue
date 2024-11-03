<template id="project-edit-tabs-template">
  <section>
    <div class="sticky-header has-background-white">
      <nav class="tabs is-small force-32-height">
        <ul>
          <li v-focus :class="{ 'is-active': selectedTab === 'details' }">
            <a href="#" @click.prevent="selectTab('details')">Details</a>
          </li>
          <li
            v-show="!vm.isNew"
            :class="{ 'is-active': selectedTab === 'items' }"
          >
            <a
              href="#"
              @click.prevent="selectTab('items', { forceResize: true })"
              >Items</a
            >
          </li>
          <li
            v-for="higher in selectedHighers"
            :key="higher.id"
            :class="{ 'is-active': `f-${higher.id}` === String(selectedTab) }"
          >
            <span class="is-flex is-align-items-bottom">
              <a href="#" @click.prevent="selectTab(`f-${higher.id}`)">
                <item-type-icon
                  class="is-small"
                  icon-class="is-size-6"
                  :type="higher.type"
                ></item-type-icon>
                <span>
                  [{{ higher.itemNumber }}] - {{ truncate(higher.name) }}
                </span>
              </a>
              <a
                href="#"
                class="pl-0 pr-0"
                title="Close higher"
                @click.prevent="handleCloseHigherTab(higher.id)"
              >
                <span class="delete is-small"></span>
              </a>
            </span>
          </li>
          <li
            v-for="item in selectedItems"
            :key="item.id"
            :class="{ 'is-active': String(item.id) === String(selectedTab) }"
          >
            <span class="is-flex is-align-items-bottom">
              <a href="#" @click.prevent="selectTab(item.id)">
                [{{ item.itemNumber }}] - {{ truncate(item.name) }}
              </a>
              <a
                href="#"
                class="pl-0 pr-0"
                title="Close item"
                @click.prevent="handleCloseItemTab(item.id)"
              >
                <span class="delete is-small"></span>
              </a>
            </span>
          </li>
        </ul>
      </nav>
    </div>

    <section v-show="selectedTab === 'details'" class="p-2 container mb-4">
      <!-- <section class="p-2" v-show="vm.currentTimelines.length > 0">
        <h2 class="subtitle mb-3">Current active timelines</h2>
        <timelines-chart :rows="vm.currentTimelineChartRows"></timelines-chart>
      </section> -->

      <project-edit-details v-focus :vm="vm"></project-edit-details>
    </section>

    <items-list
      v-show="selectedTab === 'items'"
      :items="vm.items"
      :versions="vm.versions"
      :default-version-filter="vm.project.version"
      @item-select="handleItemSelect"
    ></items-list>

    <items-list
      v-for="higher in selectedHighers"
      v-show="`f-${higher.id}` === String(selectedTab)"
      :key="higher.id"
      :items="higherRelatedItemsIndex[higher.id]"
      :versions="vm.versions"
      :default-version-filter="vm.project.version"
      @item-select="handleItemSelect"
    ></items-list>

    <item-edit-details
      v-for="item in selectedItems"
      v-show="String(item.id) === String(selectedTab)"
      class="p-2 container mb-4"
      :key="item.id"
      :item="item"
      @open-item="handleOpenRelatedItem"
      @new-item="handleItemSelect"
      @related-items-select="handleRelatedItemsSelect"
    ></item-edit-details>
  </section>
</template>

<script>
const ProjectEditTabs = {
  props: {
    vm: Object,
    selectItem: Object,
    selectHigher: Object,
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

    if (["details", "items"].includes(tab)) {
      this.selectTab(tab, { forceResize: true });
    } else {
      const item = this.vm.items.find((itm) => String(itm.id) === String(tab));
      if (item) {
        this.handleItemSelect(item);
        return;
      } else {
        const higher = this.vm.items.find(
          (itm) => `f-${itm.id}` === String(tab)
        );
        if (higher) {
          this.handleHigherSelect(higher);
          return;
        }
      }

      this.selectTab("details");
    }
  },

  data() {
    return {
      selectedItems: [],
      selectedHighers: [],
    };
  },

  computed: {
    selectedTab() {
      return this.state.app.currentQueryParams.tab || "details";
    },
    higherRelatedItemsIndex() {
      const index = {};
      console.time("higherRelatedItemsIndex");
      this.selectedHighers.forEach(
        (higher) =>
          (index[higher.id] = this.vm.getDeepItemRelatedList(higher))
      );
      console.timeEnd("higherRelatedItemsIndex");
      return index;
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
    handleHigherSelect(higher) {
      const selected = this.selectedHighers.find((ft) => ft.id === higher.id);
      if (!selected) this.selectedHighers.push(higher);

      this.$nextTick().then(() =>
        this.selectTab(`f-${higher.id}`, { forceResize: true })
      );
    },
    handleItemSelect(item) {
      const selected = this.selectedItems.find((it) => it.id === item.id);
      // Add a copy of the item to the selectedItems list, avoids re-rendering ItemLists when the item is edited
      if (!selected) this.selectedItems.push(JSON.parse(JSON.stringify(item)));

      this.selectTab(item.id);
    },
    handleCloseItemTab(id) {
      const isSelected = String(id) === String(this.selectedTab);
      this.selectedItems = this.selectedItems.filter((item) => item.id !== id);

      if (!isSelected) return;

      if (this.selectedItems.length > 0)
        this.selectTab(this.selectedItems[this.selectedItems.length - 1].id);
      else this.selectTab("items", { forceResize: true });
    },
    handleCloseHigherTab(id) {
      const isSelected = `f-${id}` === String(this.selectedTab);
      this.selectedHighers = this.selectedHighers.filter(
        (higher) => higher.id !== id
      );

      if (!isSelected) return;

      if (this.selectedHighers.length > 0)
        this.selectTab(
          `f-${this.selectedHighers[this.selectedHighers.length - 1].id}`
        );
      else this.selectTab("items", { forceResize: true });
    },
    handleOpenRelatedItem(id) {
      const item = this.vm.items.find((itm) => itm.id === id);
      if (item) this.handleItemSelect(item);
    },
    handleRelatedItemsSelect(higher) {
      this.handleHigherSelect(higher);
    },
    truncate(str, len = 10) {
      if (!str) return "New item...";
      if (str.length <= len + 3) return str;

      return `${str.slice(0, len)}...`;
    },
  },

  watch: {
    selectItem: {
      handler(newVal, oldVal) {
        if (!newVal || newVal === oldVal) return;

        this.handleItemSelect(newVal);
        this.$emit("update:selectItem", null);
      },
      immediate: true,
    },
    selectHigher: {
      handler(newVal, oldVal) {
        if (!newVal || newVal === oldVal) return;

        this.handleHigherSelect(newVal);
        this.$emit("update:selectHigher", null);
      },
      immediate: true,
    },
  },

  template: document.querySelector("#project-edit-tabs-template").innerHTML,
};

app.component("project-edit-tabs", ProjectEditTabs);
</script>