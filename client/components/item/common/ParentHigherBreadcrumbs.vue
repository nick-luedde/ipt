<template id="parent-higher-breadcrumbs-template">
  <nav class="breadcrumb" aria-label="breadcrumbs">
    <ul>
      <li v-for="higher in reversedParentHigherItems" :key="higher.id">
        <a href="#" @click.prevent="handleHigherClick(higher)"> [{{ higher.itemNumber }}] - {{ higher.name }} </a>
      </li>
    </ul>
  </nav>
</template>

<script>
export default {
  props: {
    vm: Object,
  },

  emits: ["higher-click"],

  computed: {
    reversedParentHigherItems() {
      return this.vm.parentHighers.reverse();
    }
  },

  methods: {
    handleHigherClick(higher) {
      this.$emit('higher-click', higher);
    }
  },

  template: document.querySelector("#parent-higher-breadcrumbs-template")
    .innerHTML,
};

app.component("parent-higher-breadcrumbs", ParentHigherBreadcrumbs);
</script>