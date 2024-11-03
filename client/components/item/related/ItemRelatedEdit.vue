<template id="item-related-edit-template">
  <section>
    <h2 class="title is-6 mb-1">Related items</h2>
    <button
      class="button is-link is-small is-fullwidth mb-1"
      @click="handleLinkItemClick"
    >
      <span class="icon is-small">
        <span aria-hidden="true" class="material-symbols-outlined">link</span>
      </span>
      <span> Link existing item </span>
    </button>

    <article v-if="!!vm.parentItem" class="mb-1">
      <p class="subtitle is-6 mb-1">Parent</p>
      <div class="is-flex is-align-items-center">
        <a href="#" class="is-size-7" @click.prevent="handleParentClick"
          >[{{ vm.parentItem.itemNumber }}] {{ vm.parentItem.name }}</a
        >
        <button
          class="button is-small is-white"
          title="Remove parent item"
          @click="handleClearParent"
        >
          <span class="icon is-small">
            <span aria-hidden="true" class="material-symbols-outlined">close</span>
          </span>
        </button>
      </div>
    </article>

    <div class="columns is-vcentered p-0 mb-0">
      <div class="column p-0">
        <p class="subtitle is-6 mb-1">Child items</p>
      </div>
      <div class="column p-0 is-narrow">
        <button
          class="button is-white is-small"
          title="Create new child item"
          @click="handleNewChildItem"
        >
          <span class="icon is-small">
            <span aria-hidden="true" class="material-symbols-outlined">add</span>
          </span>
        </button>
      </div>
    </div>
    <div
      v-for="item in vm.relatedItems"
      :key="item.id"
      class="is-flex is-size-7 pb-1"
    >
      <a href="#" @click.prevent="handleGoToRelatedItem(item)"
        >[{{ item.itemNumber }}] {{ item.name }}</a
      >
      -
      <item-type-icon icon-class="is-size-6" :type="item.type"></item-type-icon
      >{{ item.type }} - {{ item.status }} - ({{ item.version }})
    </div>

    <linked-item-picker
      v-if="showItemPicker"
      v-focus
      height="90%"
      v-model:show="showItemPicker"
      :items="linkedItemOptions"
      @item-select="handleLinkItemSelect"
    ></linked-item-picker>
  </section>
</template>

<script>
const ItemRelatedEdit = {
  props: {
    vm: Object,
  },

  emits: ["open-item", "new-item"],

  setup() {
    return {
      state: {
        app: store.state.app,
      },
      dispatch: {
        item: store.dispatch.item,
      },
    };
  },

  data() {
    return {
      showItemPicker: false,
    };
  },

  computed: {
    linkedItemOptions() {
      return this.vm.projectItems.filter((itm) => itm.id !== this.vm.item.id);
    },
  },

  methods: {
    handleNewChildItem() {
      const newChildItem = this.dispatch.item.createNewItem({
        project: this.vm.item.project,
        parent: this.vm.item.id,
        version: this.vm.project.version,
      });
      this.$emit("new-item", newChildItem);
    },
    handleLinkItemSelect({ type, item }) {
      if (type === "parent") {
        this.vm.item.parent = item.id;
        this.vm.autosave();
        return;
      }

      if (type === "child") {
        this.vm.linkChildItem(item);
        return;
      }
    },
    handleParentClick() {
      this.goToItemBasedOnViewContext(this.vm.parentItem.id);
    },
    handleClearParent() {
      this.vm.item.parent = null;
      this.vm.autosave();
    },
    handleGoToRelatedItem(item) {
      this.goToItemBasedOnViewContext(item.id);
    },
    handleLinkItemClick() {
      this.showItemPicker = true;
    },
    goToItemBasedOnViewContext(id) {
      const { currentRoute } = this.state.app;

      if (String(currentRoute).startsWith("/project/"))
        this.$emit("open-item", id);
      else this.$router.push(`/item/${id}`);
    },
  },

  template: document.querySelector("#item-related-edit-template").innerHTML,
};

app.component("item-related-edit", ItemRelatedEdit);
</script>