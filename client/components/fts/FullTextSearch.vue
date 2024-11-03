<template id="full-text-search-template">
  <section class="dropdown" :class="{ 'is-active': showResults, 'is-right': !isTouchWidth, 'is-up': isTouchWidth }">
    <div class="dropdown-trigger">
      <div class="control has-icons-left" :class="{ 'is-loading': searching }">
        <input
          ref="searchInput"
          aria-label="App search"
          type="search"
          class="input is-small is-rounded"
          :style="inputStyle"
          :placeholder="searchPlaceholder || 'Search...'"
          v-model="search"
          @keydown="handleKeyDown"
        />
        <span class="icon is-left is-small" style="padding-bottom: 4px;">
          <span aria-hidden="true" class="material-symbols-outlined">search</span>
        </span>
      </div>
    </div>
    <div
      class="dropdown-menu link-border"
      style="max-height: 30vh; overflow-y: auto; min-width: 50vw"
      aria-live="polite"
    >
      <div class="dropdown-content">
        <div
          v-for="result in results"
          :key="result.model.id"
          class="dropdown-item highlight-border-bottom"
        >
          <search-result-row
            :result="result"
            @keydown="handleKeyDown"
            @result-select="handleResultSelect"
          ></search-result-row>
        </div>
        <div v-show="searching" class="dropdown-item">
          <div class="is-flex is-justify-content-center">
            <bulma-spinner color="var(--link-color)"></bulma-spinner>
          </div>
        </div>
        <div v-show="!searching && results.length === 0" class="dropdown-item">
          No results found...
        </div>
      </div>
    </div>
  </section>
</template>

<script>
const FullTextSearch = {
  props: {
    searchPlaceholder: String,
    inputStyle: {
      type: Object,
      default: () => ({})
    }
  },

  setup() {
    const { onUnmounted } = Vue;

    const work = AppsWorker("worker-fts");

    onUnmounted(() => work.worker.terminate());

    return {
      state: {
        app: store.state.app,
        data: store.state.data,
      },
      work,
    };
  },

  data() {
    return {
      searching: false,
      showResults: false,
      isTouchWidth: false,
      search: "",
      results: [],
    };
  },

  methods: {
    async handleSearch() {
      this.results = [];
      
      if (!this.search) {
        this.showResults = false;
        return;
      }

      this.searching = true;
      this.isTouchWidth = this.getIsTouchScreenWidth();
      this.showResults = true;
      const search = String(this.search).toLowerCase();

      const models = JSON.stringify({
        projects: this.state.data.projects,
        items: this.state.data.items,
        comments: this.state.data.comments,
      });

      try {
        this.results = await this.work.exec("fts", search, models);
      } catch (err) {
        console.error(err);
        this.state.app.errorMessage = err.message;
      }

      this.searching = false;
    },
    handleResultSelect(res) {
      this.results = [];
      this.showResults = false;
      this.$router.push(`/${res.type.toLowerCase()}/${res.model.id}`);
    },
    handleKeyDown(e) {
      if (e.key === "Escape") {
        this.showResults = false;
        this.$refs.searchInput.focus();
        return;
      }

      if (e.key === "Enter") this.handleSearch();
    },
    getIsTouchScreenWidth() {
      const BULMA_TABLET_SCREEN_WIDTH = 1023;
      return window.innerWidth <= BULMA_TABLET_SCREEN_WIDTH;
    }
  },

  template: document.querySelector("#full-text-search-template").innerHTML,
};

app.component("full-text-search", FullTextSearch);
</script>