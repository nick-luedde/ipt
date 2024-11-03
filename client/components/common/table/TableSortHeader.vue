<template id="table-sort-header-template">
  <div class="columns is-mobile" style="width: 100%">
    <div
      class="column"
      v-for="(header, index) in displayHeaders"
      :key="header.prop"
      :class="{
        [sizes[index]]: !!sizes[index],
        [header.visibility]: !!header.visibility,
      }"
    >
      <a
        href="#"
        role="button"
        class="subtitle is-6 is-clickable"
        title="Sort"
        :class="{ [sortClass]: criteria.sort.header === header.prop }"
        @click.prevent="sortByHeader(header.prop)"
        >{{ header.caption }}</a
      >
    </div>
  </div>
</template>

<style>
/* Sort indicators added '-0acfde' just to scope the classname */
.sort-asc-0acfde::after {
  content: "▲";
  margin-left: 6px;
}

.sort-desc-0acfde::after {
  content: "▼";
  margin-left: 6px;
}
</style>

<script>
const TableSortHeader = {
  props: {
    sizes: Array,
    headers: Array,
    criteria: Object,
  },

  computed: {
    sortClass() {
      return this.criteria.sort.ascending
        ? "sort-asc-0acfde"
        : "sort-desc-0acfde";
    },
    displayHeaders() {
      return this.headers.filter((h) => !h.searchOnly);
    },
  },

  methods: {
    sortByHeader(header, e) {
      //Enter keypress activates the sort
      if (e && e.key !== "Enter") return;

      const ascending =
        this.criteria.sort.header === header
          ? !this.criteria.sort.ascending
          : false;

      const newSort = {
        header,
        ascending,
      };

      this.criteria.sort = newSort;
    },
  },

  template: document.querySelector("#table-sort-header-template").innerHTML,
};

app.component("table-sort-header", TableSortHeader);
</script>