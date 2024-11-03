<template id="scrollable-hero-table-template">
  <div>
    <div
      ref="hero"
      class="hero is-small"
      style="border-bottom: 1px solid gray"
      :class="headerClass"
    >
      <div class="hero-body p-2">
        <section class="container">
          <h1
            class="title is-4 mb-1"
            v-if="!!title"
          >{{ title }}</h1>

          <table-search
            :criteria="criteria"
            :count="count"
            :more-options="searchMoreOptions"
            :displayed-rows="displayedRows"
            :all-rows="rows"
            @more-options-action="$emit('more-options-action', $event)"
          ></table-search>

          <table-filter
            :fields="filterFields"
            :dates="filterDates"
            :criteria="criteria"
          ></table-filter>
        </section>
      </div>
    </div>

    <scrollable-filter-table
      :headers="headers"
      :filter-fields="filterFields"
      :filter-dates="filterDates"
      :criteria="criteria"
      :rows="rows"
      v-model:count="count"
      :window-x-y="windowXY"
      :offset="offset"
      :use-worker="useWorker"
      @row-select="handleRowSelect"
      @update:displayed-rows="handleUpdateDisplayedRows"
    >
      <template
        v-for="(_, name) in $slots"
        v-slot:[name]="slotData"
      >
        <slot
          :name="name"
          v-bind="slotData"
        ></slot>
      </template>
    </scrollable-filter-table>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    // { prop: <property name>, caption: <header caption to display> }
    headers: Array,
    // { Object containing all of the header prop names, MUST contain unique id prop }
    rows: Array,
    // { prop: <property name> , options: <array of options> { value, text } }
    filterFields: {
      type: Array,
      default: () => [],
    },
    // { prop: <property name> , label: <string> }
    filterDates: {
      type: Array,
      default: () => [],
    },
    //{ filter: { prop: value, ... }, sort: { header: prop, ascending: boolean }, search: value }
    criteria: Object,
    // options for the header columns class
    //helpfull if you want to make it sticky or something i think
    headerClass: {
      type: [String, Object],
      default: "is-white sticky-header",
    },
    searchMoreOptions: {
      type: Array,
      default: () => [],
    },
    freezeColumn: Number,
    useWorker: Boolean,
    offset: Number,
  },

  emits: ["row-select", "update:displayed-rows", "update:freeze-column", "more-options-action", "update:hero"],

  created() {
    const defaultFilter = this.filterFields.reduce((obj, fld) => {
      obj[fld.prop] = this.criteria.filter[fld.prop] || "";
      return obj;
    }, {});

    this.criteria.filter = defaultFilter;
  },

  mounted() {
    window.addEventListener("resize", this.updateWindowXY);
    this.updateWindowXY();
    this.$emit('update:hero', this.$refs.hero);
  },

  destroyed() {
    window.removeEventListener("resize", this.updateWindowXY);
  },

  data() {
    return {
      count: 0,
      windowXY: {
        x: window.innerWidth,
        y: window.innerHeight,
      },
      displayedRows: [],
    };
  },

  methods: {
    handleRowSelect(row) {
      this.$emit("row-select", row);
    },
    updateWindowXY() {
      this.windowXY = {
        x: window.innerWidth,
        y: window.innerHeight,
      };
    },
    handleUpdateDisplayedRows(rows) {
      this.displayedRows = rows;
      this.$emit("update:displayed-rows", rows);
    },
    handleUpdateFreezeColumn(index) {
      this.$emit("update:freeze-column", index);
    }
  },

  template: document.querySelector("#scrollable-hero-table-template").innerHTML,
};

app.component("scrollable-hero-table", ScrollableHeroTable);
</script>