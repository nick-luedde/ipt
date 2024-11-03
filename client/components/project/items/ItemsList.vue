<template id="items-list-template">
  <scrollable-hero-table
    v-focus
    header-class="is-white sticky-header has-small-tabs"
    :offset="24"
    :headers="headers"
    :rows="rows"
    :filter-fields="filterFields"
    :criteria="criteria"
    :use-worker="true"
    :search-more-options="searchMoreOptions"
    @more-options-action="handleMoreOptionsAction"
    @row-select="handleRowSelect"
  >
    <template #type="row">
      <span class="icon-text is-flex-wrap-nowrap">
        <item-type-icon
          class="is-small"
          icon-class="is-size-6"
          :type="row.item.type"
        ></item-type-icon>
        <span>
          {{ row.item.type }}
        </span>
      </span>
    </template>
    <template #status="row">
      <span class="tag" :class="row.itemStatusBulmaTag">
        {{ row.item.status }}
      </span>
    </template>
  </scrollable-hero-table>
</template>

<script>
const ItemsList = {
  props: {
    items: Array,
    versions: Array,
    defaultVersionFilter: String,
  },

  emits: ["item-select"],

  setup() {
    const { users, itemTypes, itemStatuses, priorities } = useListFilters();

    return {
      users,
      itemTypes,
      itemStatuses,
      priorities,
      dispatch: {
        util: store.dispatch.util,
      },
    };
  },

  data() {
    return {
      headers: [
        {
          prop: "itemNumber",
          caption: "#",
        },
        {
          prop: "name",
          caption: "Name",
          style: { 'min-width': '20vw' },
        },
        {
          prop: "description",
          searchOnly: true,
        },
        {
          prop: "_assignee",
          caption: "Assigned to",
        },
        {
          prop: "type",
          caption: "Type",
        },
        {
          prop: "priority",
          caption: "Priority",
        },
        {
          prop: "status",
          caption: "Status",
        },
        {
          prop: "version",
          caption: "Version",
        },
        {
          prop: "_tagsDisplay",
          caption: "Tags",
        },
        {
          prop: "hours",
          caption: "Hours",
        },
        {
          prop: "closedDate",
          caption: "Closed",
        },
        {
          prop: "_modifiedDate",
          caption: "Last updated",
        },
        {
          prop: "_modifiedBy",
          caption: "Last updated by",
        },
        {
          prop: "_createdDate",
          caption: "Created",
        },
        {
          prop: "_createdBy",
          caption: "Created by",
        },
        {
          prop: "_search",
          searchOnly: true,
        },
      ],
      filterDates: [
        {
          prop: "_createdDate",
          caption: "Created",
        },
      ],
      criteria: {
        search: "",
        filter: {
          version: [this.defaultVersionFilter],
        },
        dates: {},
        sort: {
          header: "itemNumber",
          ascending: false,
        },
      },
      searchMoreOptions: [
        {
          caption: "Export to csv",
          action: "EXPORT_TO_CSV",
        },
      ],
    };
  },

  computed: {
    rows() {
      const removeEmailAt = (email) => String(email).split("@")[0];
      const formatJsonDate = (dt) => String(dt).split("T")[0];

      return this.items.map((item) => {
        const vm = useItemViewModel(item);

        return {
          item,
          ...item,
          itemStatusBulmaTag: vm.itemStatusBulmaTag,
          _rowKey: item.id,
          _tagsDisplay: item.tags.join(" | "),
          _assignee: removeEmailAt(item.assignee),
          _createdDate: formatJsonDate(item.createdDate),
          _createdBy: removeEmailAt(item.createdBy),
          _modifiedDate: formatJsonDate(item.modifiedDate),
          _modifiedBy: removeEmailAt(item.modifiedBy),
          _search: vm.comments.map((c) => c.comment).join(" "),
          item__tags: true,
        };
      });
    },
    itemTags() {
      const set = new Set(this.items.map((itm) => itm.tags).flat());
      return [...set]
        .filter((tag) => !!tag)
        .map((tag) => ({ value: tag, text: tag }));
    },
    filterFields() {
      return [
        {
          prop: "assignee",
          options: [
            {
              value: "",
              text: "- Assignees -",
            },
            ...this.users,
          ],
        },
        {
          prop: "type",
          options: [
            {
              value: "",
              text: "- Types -",
            },
            ...this.itemTypes,
          ],
        },
        {
          prop: "priority",
          options: [
            {
              value: "",
              text: "- Priorities -",
            },
            ...this.priorities,
          ],
        },
        {
          prop: "status",
          options: [
            {
              value: "",
              text: "- Statuses -",
            },
            ...this.itemStatuses,
          ],
        },
        {
          prop: "item__tags",
          options: [
            {
              value: "",
              text: "- Tags -",
            },
            ...this.itemTags,
          ],
        },
        {
          prop: "version",
          options: [
            {
              value: "",
              text: "- Versions -",
            },
            ...this.versions.map((v) => ({ value: v, text: v })),
          ],
        },
      ];
    },
  },

  methods: {
    handleRowSelect({ row, index }) {
      this.$emit("item-select", row.item);
    },
    handleMoreOptionsAction({ action, displayedRows, allRows }) {
      switch (action) {
        case "EXPORT_TO_CSV":
          this.handleExportToCsv(displayedRows);
          break;
      }
    },
    handleExportToCsv(displayedRows) {
      const dataToDownload = displayedRows.map((row) => {
        const obj = {};
        this.headers
          .filter((header) => !header.searchOnly)
          .forEach((header) => (obj[header.caption] = row[header.prop]));
        return obj;
      });

      this.dispatch.util.downloadDataAsCsv(
        `IS-Projects-download_items_data_${new Date().toJSON()}.csv`,
        dataToDownload
      );
    },
  },

  watch: {},

  template: document.querySelector("#items-list-template").innerHTML,
};

app.component("items-list", ItemsList);
</script>