<template id="table-search-template">
  <div class="field mb-2" :class="{ 'has-addons': count !== undefined }">
    <div class="control is-expanded">
      <input
        aria-label="Search"
        type="search"
        class="input is-small"
        placeholder="Search..."
        :class="{ 'is-info': !!criteria.search }"
        :value="criteria.search"
        @change="syncSearch"
        @keydown="handleSearchKeydown"
      />
    </div>
    <div class="control" v-if="count !== undefined">
      <button
        role="generic"
        class="button is-small is-static has-background-white"
        disabled
        style="opacity: 1"
      >
        {{ count }} record(s)
      </button>
    </div>
    <div v-if="moreOptions && moreOptions.length > 0" class="control">
      <div class="dropdown is-right" :class="{ 'is-active': showMoreDropdown }" style="height: 100%;">
        <div class="dropdown-trigger">
          <button
            class="button is-small"
            title="More"
            aria-haspopup="true"
            @click="handleShowMoreDropdown"
          >
            <span class="icon">
              <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
            </span>
          </button>
        </div>
        <div class="dropdown-menu">
          <div class="dropdown-content light-border">
            <a
              v-for="option in moreOptions"
              :key="option.caption"
              href="#"
              aria-label="Search"
              class="dropdown-item"
              @click.prevent="handleMoreOptionsAction(option.action)"
            >
              {{ option.caption }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const TableSearch = {
  props: {
    criteria: Object,
    count: Number,
    // { caption: String, action: String (action identifier) }
    moreOptions: Array,
    allRows: Array,
    displayedRows: Array,
  },

  emits: ["more-options-action"],

  data() {
    return {
      showMoreDropdown: false,
    };
  },

  methods: {
    syncSearch(e) {
      this.criteria.search = e.target.value;
    },
    handleSearchKeydown(e) {
      if (e.key === "Enter" || e.key === "Escape") this.syncSearch(e);
    },
    handleMoreOptionsAction(action) {
      this.$emit("more-options-action", {
        action,
        allRows: this.allRows,
        displayedRows: this.displayedRows,
      });
      this.showMoreDropdown = false;
    },
    handleShowMoreDropdown() {
      this.showMoreDropdown = !this.showMoreDropdown;
    },
  },

  template: document.querySelector("#table-search-template").innerHTML,
};

app.component("table-search", TableSearch);
</script>