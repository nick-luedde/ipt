<template id="scrollable-filter-table-template">
  <div
    class="table-container"
    ref="scrollElement"
    style="overflow-y: scroll; position: relative"
  >
    <table class="table scrollable-table-aac092">
      <thead>
        <tr>
          <th
            class="sticky-table-header-aac092"
            v-for="(header, index) in displayHeaders"
            :style="header.style"
            :class="[headerBackgroundClass, { 'sticky-table-row-aac092 z-3-aac092': index === internalFreezeColumn }, header.class || '']"
            :key="header.prop"
            scope="col"
          >
            <span
              tabindex="0"
              class="subtitle is-6 is-clickable"
              :class="{ [sortClass]: criteria.sort.header === header.prop }"
              @click="sortByHeader(header.prop)"
              @keydown="sortByHeader(header.prop, $event)"
            >{{ header.caption }}
            </span>
            <a
              href="#"
              aria-label="Pin column"
              title="Pin column"
              style="height: 1.5rem;"
              class="ml-2 button is-small is-ghost p-0 pin-hover-aac092"
              :class="{ 'has-text-primary': index === internalFreezeColumn }"
              @click.prevent="handleFreezeColumn(index)"
            >
              <span
                class="material-symbols-outlined is-size-6"
                :class="{ 'pin-aac092': index !== internalFreezeColumn }"
              >push_pin</span>
            </a>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          style="position: relative;"
          v-if="working"
        >
          <td><loading-inset></loading-inset></td>
        </tr>
        <tr
          v-else
          tabindex="0"
          class="is-clickable highlight-hover"
          v-for="(row, index) in displayRows"
          :class="headerBackgroundClass"
          :key="row._rowKey"
          @click="handleRowSelect(row, index)"
          @keydown="handleRowSelect(row, index, $event)"
        >
          <td
            v-for="(header, hindex) in displayHeaders"
            :key="header.prop"
            :class="{ 'sticky-table-row-aac092 z-2-aac092': hindex === internalFreezeColumn }"
          >
            <slot
              :name="header.prop"
              v-bind="row"
            >{{ row[header.prop] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-show="!working"
      class="p-5"
    >
      <button
        aria-label="Loading"
        v-show="filteredRows.length > rowsToDisplay"
        class="button is-fullwidth static is-white is-loading"
      ></button>
    </div>
  </div>
</template>

<style>
/* added '-aac092' just to scope the classname */
.sticky-table-header-aac092 {
  position: sticky;
  top: 0;
  /* border: 1px solid var(--soft-color) !important; */
  z-index: 1;
  background-color: inherit;
  white-space: nowrap;
  font-weight: bold;
}

.sticky-table-row-aac092 {
  position: sticky;
  left: 0;
  border-right: 1px solid lightslategray !important;
  background-color: inherit;
}

.z-2-aac092 {
  z-index: 2;
}

.z-3-aac092 {
  z-index: 3;
}

.scrollable-table-aac092 {
  table-layout: fixed;
  /* width: max-content; */
  min-width: 100%;
  /* quick fix for dissapearing borders on scroll... */
  border-collapse: separate;
}

.pin-aac092 {
  visibility: hidden;
}

.pin-hover-aac092:hover>span.pin-aac092,
.pin-hover-aac092:focus>span.pin-aac092 {
  visibility: visible;
}

.sort-asc-aac092::after {
  content: "▲";
  margin-left: 6px;
}

.sort-desc-aac092::after {
  content: "▼";
  margin-left: 6px;
}
</style>

<script>
export default {
  props: {
    criteria: Object,
    headers: Array,
    filterFields: Array,
    filterDates: Array,
    count: Number,
    rows: Array,
    windowXY: Object,
    offset: Number,
    headerBackgroundClass: {
      type: String,
      default: "has-background-white",
    },
    freezeColumn: {
      type: Number
    },
    useWorker: Boolean
  },

  emits: ["update:count", "update:displayed-rows", "update:freeze-column", "row-select"],

  setup(props, context) {
    const { watch } = Vue;

    const {
      rows,
      criteria,
      headers,
      filterFields,
      filterDates,
      working,
      rowsToDisplay,
      scrollElement,
      filteredRows,
      displayRows,
    } = useTableSortFilterScroll(context, {
      rows: props.rows,
      headers: props.headers,
      criteria: props.criteria,
      filterFields: props.filterFields,
      filterDates: props.filterDates,
      useWorker: props.useWorker
    });

    watch(
      () => props.criteria,
      (newVal) => (criteria.value = newVal)
    );
    watch(
      () => props.rows,
      (newVal) => (rows.value = newVal)
    );
    watch(
      () => props.headers,
      (newVal) => (headers.value = newVal)
    );
    watch(
      () => props.filterFields,
      (newVal) => (filterFields.value = newVal)
    );
    watch(
      () => props.filterDates,
      (newVal) => (filterDates.value = newVal)
    );

    return {
      rows,
      criteria,
      headers,
      rowsToDisplay,
      scrollElement,
      filteredRows,
      displayRows,
      working
    };
  },

  data() {
    return {
      internalFreezeColumn: null
    }
  },

  computed: {
    sortClass() {
      return this.criteria.sort.ascending
        ? "sort-asc-aac092"
        : "sort-desc-aac092";
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
    handleRowSelect(row, index, e) {
      if (!e || e.key === "Enter") this.$emit("row-select", { row, index });
    },
    handleFreezeColumn(index) {
      const isCurrent = this.internalFreezeColumn === index;
      const newI = isCurrent ? null : index;
      this.internalFreezeColumn = newI;
      this.$emit('update:freeze-column', newI);
    }
  },

  watch: {
    windowXY: {
      handler(newXY) {
        const self = this;

        // needed to postpone till next tick as it would throw an error on init
        this.$nextTick().then(() => {
          const container = self.$refs.scrollElement;

          let offset = container.getBoundingClientRect().top;
          if (this.offset)
            offset += this.offset;

          container.style.height = `${newXY.y - offset}px`;
        });
      },
      immediate: true,
    },
    criteria: {
      handler() {
        const container = this.$refs.scrollElement;

        container.scroll({
          top: 0,
          left: container.scrollX,
          behavior: "smooth",
        });
      },
      deep: true,
    },
    freezeColumn(val) {
      this.internalFreezeColumn = val;
    }
  },

  template: document.querySelector("#scrollable-filter-table-template")
    .innerHTML,
};

app.component("scrollable-filter-table", ScrollableFilterTable);
</script>