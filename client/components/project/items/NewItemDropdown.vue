<template id="new-item-dropdown-template">
  <div class="dropdown" :class="{ 'is-active': isActive }" :style="style">
    <div class="dropdown-trigger" :style="style">
      <button
        class="button is-small"
        :style="style"
        aria-haspopup="true"
        @click="isActive = !isActive"
      >
        <span>Add new item</span>
        <span class="icon is-small">
          <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
        </span>
      </button>
    </div>
    <div class="dropdown-menu">
      <div class="dropdown-content">
        <a
          v-for="type in state.list.types"
          :key="type"
          href="#"
          class="dropdown-item"
          @click.prevent="handleTypeClick(type)"
        >
          <span class="icon-text">
            <item-type-icon class="is-small" :type="type"></item-type-icon>
            <span class="ml-1 is-size-7">
              {{ type }}
            </span>
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
const NewItemDropdown = {
  props: {
    fullwidth: Boolean,
  },

  emits: ["type-select"],

  setup() {
    return {
      state: {
        list: store.state.list,
      },
    };
  },

  data() {
    return {
      isActive: false,
    };
  },

  computed: {
    style() {
      const style = {};
      if (this.fullwidth) style.width = "100%";

      return style;
    },
  },

  methods: {
    handleTypeClick(type) {
      this.$emit("type-select", type);
      this.isActive = false;
    },
  },

  template: document.querySelector("#new-item-dropdown-template").innerHTML,
};

app.component("new-item-dropdown", NewItemDropdown);
</script>