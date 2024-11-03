<template id="hero-slot-table-template">
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
            :count="filteredRows.length"
            :more-options="searchMoreOptions"
            :displayed-rows="filteredRows"
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
      <section
        class="container pb-2"
        style="width: 100%"
      >
        <table-sort-header
          :sizes="sizes"
          :headers="headers"
          :criteria="criteria"
        ></table-sort-header>
      </section>
    </div>
    <div
      v-show="working"
      class="mt-2"
      style="position: relative;"
    >
      <loading-inset></loading-inset>
    </div>
    <div
      v-show="!working"
      class="mt-2"
    >
      <slot
        v-for="row in displayRows"
        :key="row._rowKey"
        v-bind="row"
      ></slot>
    </div>
  </div>
</template>

<script>
const HeroSlotTable = {
  props: {
    title: String,
    // bulma column size classes
    sizes: Array,
    // { prop: <property name>, caption: <header caption to display> }
    headers: Array,
    // { Object containing all of the rows, MUST contain unique id prop }
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
    useWorker: Boolean
  },

  emits: ["more-options-action", "update:count", "update:displayed-rows", "update:hero"],

  setup(props, context) {
    const { watch, ref, onMounted } = Vue;

    const defaultFilter = props.filterFields.reduce((obj, fld) => {
      obj[fld.prop] = props.criteria.filter[fld.prop] || "";
      return obj;
    }, {});

    const hero = ref(null);

    props.criteria.filter = defaultFilter;

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

    onMounted(() => context.emit('update:hero', hero.value));

    return {
      hero,
      rows,
      criteria,
      headers,
      filteredRows,
      displayRows,
      rowsToDisplay,
      working
    };
  },

  template: document.querySelector("#hero-slot-table-template").innerHTML,
};

app.component("hero-slot-table", HeroSlotTable);
</script>