<template id="item-edit-view-template">
  <main v-if="!!vm">
    <side-menu-container>
      <section class="p-2">
        <h1 class="title is-6">Work item</h1>
        <h2 class="subtitle is-6 mb-2">
          Project: {{ vm.project.name }} - (v{{ vm.project.version }})
        </h2>
        <hr />
      </section>
      <button
        class="button is-small is-fullwidth is-radiusless"
        @click="handleOpenProject"
      >
        <span class="icon">
          <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
        </span>
        <span> Open project </span>
      </button>
    </side-menu-container>

    <side-menu-content>
      <item-edit-details
        class="p-2"
        :item="vm.item"
        @new-item="handleNewItem"
      ></item-edit-details>
    </side-menu-content>
  </main>
</template>

<script>
const ItemEditView = {
  props: {
    id: String,
  },

  setup(props) {
    const { state } = store;

    const { itemById } = store.calculated;

    const item = !state.app.currentQueryParams.isNew
      ? itemById.value[props.id]
      : state.item.newItem;

    // clear new item once referenced
    state.item.newItem = null;

    //create the viewmodel with a copy of the item object to keep it separate from other interactions with the main item data 
    const vm = item ? useItemViewModel(JSON.parse(JSON.stringify(item))) : null;

    return {
      vm,
      state: {
        app: store.state.app,
        item: store.state.item,
      },
    };
  },

  created() {
    if (!this.vm) this.$router.replace("/not-found");
  },

  data() {
    return {};
  },

  methods: {
    handleOpenProject() {
      this.$router.push({
        path: `/project/${this.vm.project.id}`,
        query: { tab: this.vm.item.id },
      });
    },
    handleNewItem(newItem) {
      this.state.item.newItem = newItem;
      this.$router.push({
        path: `/item/${newItem.id}`,
        query: { isNew: true },
      });
    },
  },

  template: document.querySelector("#item-edit-view-template").innerHTML,
};

app.component("item-edit-view", ItemEditView);
</script>