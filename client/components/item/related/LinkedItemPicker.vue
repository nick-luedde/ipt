<template id="linked-item-picker-template">
  <aside class="modal" role="dialog" :class="{ 'is-active': show }">
    <div class="modal-background" @click="handleClose"></div>
    <div class="modal-card" :style="sizeStyle">
      <header class="modal-card-head">
        <label class="label is-small">
          Link type
          <div class="select is-small">
            <select v-model="linkType" @change="handleFilterChange">
              <option value="parent">Parent</option>
              <option value="child">Child</option>
            </select>
          </div>
        </label>
        <input
          aria-label="Search items"
          type="search"
          class="input is-small ml-1 mr-3"
          placeholder="Search items..."
          v-model="search"
          @input="handleFilterChange"
        />
        <button class="delete" aria-label="close" @click="handleClose"></button>
      </header>
      <section class="modal-card-body">
        <div class="panel-is-shadowless is-radiusless">
          <a
            v-for="item in filteredItems"
            :key="item.id"
            href="#"
            class="panel-block is-size-7"
            :class="{
              'has-background-link theme-independent-white-font is-radiusless': item === selectedItem,
            }"
            @click.prevent="handleSelectItem(item)"
          >
            <span style="width: 65%">
              [{{ item.itemNumber }}] {{ item.name }} -
            </span>
            <item-type-icon
              icon-class="is-size-6"
              :type="item.type"
            ></item-type-icon>
            {{ item.type }} - ({{ item.version }}) -
            {{ formatJsonDate(item.createdDate) }}</a
          >
        </div>
      </section>
      <footer class="modal-card-foot is-justify-content-end">
        <button
          class="button is-dark is-small"
          :disabled="!linkType || !selectedItem"
          @click="handlCreateLink"
        >
          Create link
        </button>
        <button class="button is-small" @click="handleClose">Cancel</button>
      </footer>
    </div>
  </aside>
</template>

<script>
const LinkedItemPicker = {
  props: {
    items: Array,
    show: Boolean,
    minwidth: {
      type: String,
      default: "auto",
    },
    height: {
      type: String,
      default: "auto",
    },
  },

  emits: ["update:show", "close", "item-select"],

  data() {
    return {
      search: "",
      linkType: "",
      selectedItem: null,
    };
  },

  computed: {
    filteredItems() {
      const lowerSearch = this.search.toLowerCase();
      const type = this.linkType;
      if (!type) return [];

      return this.items
        .filter((item) => (type === "child" ? !item.parent : true))
        .filter(
          (item) =>
            `[${String(item.itemNumber)}] ${String(
              item.name
            ).toLowerCase()}`.includes(lowerSearch) ||
            String(item.description).toLowerCase().includes(lowerSearch) ||
            String(item.type).toLowerCase().includes(lowerSearch) ||
            String(item.createdDate).toLowerCase().includes(lowerSearch)
        );
    },
    sizeStyle() {
      return {
        "min-width": this.minwidth,
        height: this.height,
      };
    },
  },

  methods: {
    handlCreateLink() {
      if (!this.linkType || !this.linkType) return;
      this.$emit("item-select", {
        type: this.linkType,
        item: this.selectedItem,
      });
      this.handleClose();
    },
    handleFilterChange() {
      this.selectedItem = null;
    },
    handleSelectItem(item) {
      this.selectedItem = item;
      this.search = `[${this.selectedItem.itemNumber}] ${this.selectedItem.name}`;
    },
    handleClose() {
      this.$emit("update:show", false);
      this.$emit("close");
    },
    formatJsonDate(dt) {
      const [dateString] = String(dt).split("T");
      return dateString;
    },
  },

  template: document.querySelector("#linked-item-picker-template").innerHTML,
};

app.component("linked-item-picker", LinkedItemPicker);
</script>