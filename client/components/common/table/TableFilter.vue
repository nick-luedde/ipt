<template id="table-filter-template">
  <section class="mb-2">
    <div v-show="showFilter && (fields.length > 0 || dates.length > 0)" class="columns is-mobile p-0 mb-1">
      <div class="column p-0 is-flex is-flex-wrap-wrap">
        <div
          class="mr-2"
          style="max-width: 25%"
          v-for="field in fields"
          :key="field.prop"
        >
          <div
            class="select is-small"
            :class="{ 'is-info': !!criteria.filter[field.prop] }"
          >
            <select
              @change="handleFilterAdd(field.prop, $event)"
              aria-label="Filter"
            >
              <option
                v-for="option in field.options"
                :key="option.value"
                :value="option.value"
                :title="option.text"
              >
                {{ truncate(option.text, 50) }}
              </option>
            </select>
          </div>
        </div>
        <div class="mr-2" v-for="date in dates" :key="date.prop">
          <div class="field has-addons">
            <div class="control">
              <a
                role="none"
                aria-hidden="true"
                class="button is-small"
                :class="{
                  'is-static': !criteria.dates[date.prop],
                  'is-info no-events': !!criteria.dates[date.prop],
                }"
                >{{ date.caption }}</a
              >
            </div>
            <div class="control">
              <input
                :aria-label="`${date.caption} start`"
                class="input is-small"
                :class="{ 'is-info': !!criteria.dates[date.prop] }"
                type="date"
                :value="
                  criteria.dates[date.prop]
                    ? criteria.dates[date.prop].start
                    : ''
                "
                @change="handleFilterDateChange('start', date.prop, $event)"
              />
            </div>
            <div class="control">
              <input
                :aria-label="`${date.caption} end`"
                class="input is-small"
                :class="{ 'is-info': !!criteria.dates[date.prop] }"
                type="date"
                :value="
                  criteria.dates[date.prop] ? criteria.dates[date.prop].end : ''
                "
                @change="handleFilterDateChange('end', date.prop, $event)"
              />
            </div>
            <div class="control">
              <button
                :disabled="
                  !(
                    criteria.dates[date.prop] &&
                    (criteria.dates[date.prop].start ||
                      criteria.dates[date.prop].end)
                  )
                "
                class="button is-small info-border"
                :title="`Clear ${date.caption.toLowerCase()} dates`"
                @click="handleClearDates(date.prop)"
              >
                <span class="icon">
                  <span aria-hidden="true" class="material-symbols-outlined">clear</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="column is-narrow p-0">
        <button
          ref="less"
          class="button is-small is-white"
          title="Hide filter options"
          @click="handleToggleShowFilter"
        >
          <span class="icon">
            <span aria-hidden="true" class="material-symbols-outlined">expand_less</span>
          </span>
        </button>
      </div>
    </div>

    <aside class="columns p-0 pb-1 is-mobile">
      <div class="column p-0">
        <section class="tags are-small">
          <span
            v-for="({ prop, val }, index) in allFilters"
            :key="index"
            :title="getFilterDisplay(prop, val)"
            class="tag is-info m-1"
          >
            <span
              style="
                max-width: 112px;
                overflow-x: hidden;
                text-overflow: ellipsis;
              "
            >
              {{ getFilterDisplay(prop, val) }}
            </span>
            <button
              class="delete is-small"
              title="Remove filter"
              @click="handleFilterRemove(prop, val)"
            ></button>
          </span>
          <span
            v-for="prop in dateFiltersToShow"
            v-show="!showFilter"
            :key="prop"
            :title="getFilterDateDisplay(prop)"
            class="tag is-info m-1"
          >
            <span
              style="
                max-width: 112px;
                overflow-x: hidden;
                text-overflow: ellipsis;
              "
            >
              {{ getFilterDateDisplay(prop) }}
            </span>
            <button
              class="delete is-small"
              title="Remove date filter"
              @click="criteria.dates[prop] = undefined"
            ></button>
          </span>
          <a
            v-show="allFilters.length >= 3"
            href="#"
            role="button"
            class="tag is-warning m-1"
            title="Clear all filters"
            @click.prevent="handleClearAllFilters"
          >
            Clear all filters
          </a>
        </section>
      </div>
      <div v-show="!showFilter" class="column is-narrow p-0">
        <button
          ref="more"
          class="button is-small is-white"
          title="Show filter options"
        >
          <span class="icon">
            <span
              aria-hidden="true"
              class="material-symbols-outlined"
              @click="handleToggleShowFilter"
              >expand_more</span
            >
          </span>
        </button>
      </div>
    </aside>
  </section>
</template>

<script>
const TableFilter = {
  props: {
    // { prop: <property name> , options: <array of options> }
    fields: Array,
    dates: Array,
    criteria: Object,
  },

  data() {
    return {
      showFilter: true,
    };
  },

  computed: {
    allFilters() {
      console.time("All_Filters"); //DEBUG
      const all = Object.keys(this.criteria.filter)
        .filter((prop) => Array.isArray(this.criteria.filter[prop]))
        .map((prop) => this.criteria.filter[prop].map((val) => ({ prop, val })))
        .flat();
      console.timeEnd("All_Filters"); //DEBUG
      return all;
    },
    dateFiltersToShow() {
      return Object.keys(this.criteria.dates).filter(
        (prop) =>
          !!this.criteria.dates[prop] && (!!this.criteria.dates[prop].start || !!this.criteria.dates[prop].end)
      );
    },
  },

  methods: {
    handleFilterAdd(prop, e) {
      console.time("Add_Filter"); //DEBUG
      const val = e.target.value;
      const filter = this.criteria.filter[prop];
      if (Array.isArray(filter)) {
        if (!filter.includes(val)) filter.push(val);
      } else this.criteria.filter[prop] = [val];

      this.dispatchResize();
      e.target.value = "";
      console.timeEnd("Add_Filter"); //DEBUG
    },
    handleFilterRemove(prop, val) {
      console.time("Remove_Filter"); //DEBUG
      const filtered = this.criteria.filter[prop];
      if (!Array.isArray(filtered)) return;

      const index = filtered.findIndex((v) => String(v) === String(val));
      if (index !== -1) filtered.splice(index, 1);

      if (filtered.length === 0) this.criteria.filter[prop] = undefined;
      this.dispatchResize();
      console.timeEnd("Remove_Filter"); //DEBUG
    },
    getFilterDisplay(prop, val) {
      const field = this.fields.find((f) => f.prop === prop) || {};
      const selection = (field.options || []).find(
        (o) => String(o.value) === String(val)
      );
      return selection ? selection.text : "(Unknown)";
    },
    handleToggleShowFilter() {
      this.showFilter = !this.showFilter;
      const refs = this.$refs;
      const toggleButton = this.showFilter ? refs.less : refs.more;
      this.$nextTick().then(() => {
        toggleButton.focus();
      });
      this.dispatchResize();
    },
    handleClearAllFilters() {
      this.criteria.filter = {};
      this.criteria.dates = {};
      this.dispatchResize();
    },
    getFilterDateDisplay(prop) {
      const filtered = this.criteria.dates[prop];
      const dateField = this.dates.find((d) => d.prop === prop);

      const caption = dateField ? dateField.caption : "";
      const hasStart = !!filtered.start;
      const hasEnd = !!filtered.end;
      const hasStartAndEnd = hasStart && hasEnd;

      const expression = hasStartAndEnd
        ? `${filtered.start} to ${filtered.start}`
        : hasStart
        ? `On or after ${filtered.start}`
        : `On or before ${filtered.end}`;

      return `${caption}: ${expression}`;
    },
    handleFilterDateChange(type, prop, e) {
      this.criteria.dates[prop] = {
        ...this.criteria.dates[prop],
        [type]: e.target.value,
      };

      const d = this.criteria.dates[prop];
      if (!d.start && !d.end) this.criteria.dates[prop] = undefined;
    },
    handleClearDates(prop) {
      this.criteria.dates[prop] = undefined;
    },
    dispatchResize() {
      this.$nextTick().then(() =>
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")))
      );
    },
    truncate(str, len) {
      let val = String(str);
      if (val.length >= len)
        val = `${val.slice(0, len)}...`;

      return val;
    }
  },

  watch: {
    criteria: {
      handler() {
        window.scroll({ top: 0, left: window.scrollX, behavior: "smooth" });
      },
      deep: true,
    },
  },

  template: document.querySelector("#table-filter-template").innerHTML,
};

app.component("table-filter", TableFilter);
</script>