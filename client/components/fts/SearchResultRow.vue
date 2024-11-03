<template id="search-result-row-template">
  <a
    href="#"
    class="is-size-7 has-text-dark"
    @click.prevent="handleClick"
    @keydown="handleKeydown"
  >
    <item-type-icon
      v-if="result.type === 'Item'"
      class="is-small mr-2"
      icon-class="is-size-6"
      :type="result.model.type"
    ></item-type-icon>
    <span v-else class="icon is-small mr-2">
      <span aria-hidden="true" class="material-symbols-outlined is-size-6 is-dark"
        >source</span
      >
    </span>
    <span>
      {{ display }}
    </span>
  </a>
</template>

<script>
const SearchResultRow = {
  props: {
    result: Object,
  },

  emits: ["keydown", "result-select"],

  computed: {
    display() {
      switch (this.result.type) {
        case "Project":
          const project = this.result.model;
          return `[Project] - ${project.name}`;

        case "Item":
          const item = this.result.model;
          return `[${item.itemNumber}] - ${item.name}`;
      }
    },
  },

  methods: {
    handleClick() {
      this.$emit("result-select", this.result);
    },
    handleKeydown(e) {
      if (e.key === "Enter")
        return;
      
      this.$emit("keydown", e);
    }
  },

  template: document.querySelector("#search-result-row-template").innerHTML,
};

app.component("search-result-row", SearchResultRow);
</script>