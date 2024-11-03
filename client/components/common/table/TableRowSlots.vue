<template id="table-row-slots-template">
  <div>
    <div
      v-show="working"
      style="position: relative;"
    >
      <loading-inset></loading-inset>
    </div>
    <div v-show="!working">
      <div
        class="columns is-mobile is-clickable"
        style="border-bottom: 1px solid gray"
        tabindex="0"
        v-for="(row, index) in displayRows"
        :key="row._rowKey"
        @click="handleRowSelect(row, index)"
        @keydown="handleRowSelect(row, index, $event)"
      >
        <div
          class="column"
          v-for="(header, index) in displayHeaders"
          :key="header.prop"
          :class="{
            [sizes[index]]: !!sizes[index],
            [header.visibility]: !!header.visibility,
          }"
          :aria-label="`${header.caption} ${row[header.prop]}`"
        >
          <slot
            v-bind="row"
            :name="header.prop"
          >{{
            row[header.prop]
          }}</slot>
        </div>
      </div>

      <div class="p-5">
        <button
          aria-label="Loading"
          v-show="filteredRows.length > rowsToDisplay"
          class="button is-fullwidth static is-white is-loading"
        ></button>
      </div>
    </div>
  </div>
</template>

<script>
const TableRowSlots = {
  props: {
    sizes: Array,
    headers: Array,
    filterFields: Array,
    filterDates: Array,
    criteria: Object,
    count: Number,
    rows: Array,
    useWorker: Boolean
  },

  emits: ["update:count", "update:displayed-rows", "row-select"],

  setup(props, context) {
    const { watch } = Vue;

    const {
      rows,
      criteria,
      headers,
      filterFields,
      filterDates,
      working,
      filteredRows,
      displayRows,
      rowsToDisplay,
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
      filteredRows,
      displayRows,
      rowsToDisplay,
      working
    };
  },

  computed: {
    displayHeaders() {
      return this.headers.filter((h) => !h.searchOnly);
    },
    displayHeaderAriaCaptions() {
      return this.displayHeaders.map((h) => h.caption).join(", ");
    },
  },

  methods: {
    handleRowSelect(row, index, e) {
      if (!e || e.key === "Enter") this.$emit("row-select", { row, index });
    },
  },

  template: document.querySelector("#table-row-slots-template").innerHTML,
};

app.component("table-row-slots", TableRowSlots);
</script>