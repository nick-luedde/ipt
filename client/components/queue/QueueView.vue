<template id="queue-view-template">

  <main class="queue-view-height">
    <split-pane
      v-model:collapsed="collapsed"
      :initial-offset="0.35"
      cache="queue-view"
    >
      <template #first>
        <!-- list of items in the queue -->
        <section
          v-if="vm.items.length === 0"
          class="p-3"
        >
          <p class="subtitle">Nothing in your queue!</p>
        </section>
        <section
          v-if="vm.items.length > 0"
          class="p-3"
          ref="list"
        >
          <div
            style="height: 16px"
            @dragover.prevent="handleDragover"
            @dragleave="handleDragleave"
            @drop.prevent="(e) => handleDrop(e, 0)"
          ></div>
          <div
            v-for="(item, index) in vm.items"
            :key="item.id"
          >
            <draggable-item
              :dragdata="item.id"
              class="mb-2"
              :data-id="item.id"
              :arrow-up-title="`Move to position ${Math.max(index, 1)} of ${vm.items.length}`"
              :arrow-down-title="`Move to position ${index + 2} of ${vm.items.length}`"
              :handle-title="`Re-order from position ${index + 1} of ${vm.items.length}`"
              @arrow-up="handleArrow(item.id, index - 1)"
              @arrow-down="handleArrow(item.id, index + 2)"
            >
              <item-card
                :class="{ 'has-background-light': vm.selectedItem === item }"
                :item="item"
                @item-click="vm.selectedItem = item"
                @project-click="vm.selectedItem = item"
              ></item-card>
            </draggable-item>
            <div
              style="height: 16px"
              @dragover.prevent="handleDragover"
              @dragleave="handleDragleave"
              @drop.prevent="(e) => handleDrop(e, index + 1)"
            ></div>
          </div>
        </section>
      </template>

      <template
        #second
        v-if="vm.selectedItem"
      >
        <item-edit-details
          :key="vm.selectedItem.id"
          class="p-5"
          :item="vm.selectedItem"
          @new-item="vm.handleNewItem"
        ></item-edit-details>
      </template>
    </split-pane>
  </main>

</template>

<style>

.queue-view-height {
  height: 100%;
}

@media screen and (min-width: 769px) {
  .queue-view-height {
    height: calc(100vh - 56px);
  }
}

</style>

<script>
export default {
  props: {},

  setup() {
    /** @type {VueOverrides} */
    const {
      ref,
      nextTick,
    } = Vue;

    const { useRoute, useRouter } = VueRouter;

    const route = useRoute();
    const router = useRouter();
    const { id } = route.query;

    const vm = useQueueViewModel({ initialId: id });

    /** @type {ValueType<Element>} */
    const list = ref(null);

    const handleGoToProject = ({ project }) => {
      router.push(`/project/${project.id}`);
    };

    const collapsed = ref(vm.items.length === 0 ? 'first' : '');

    const displayAsDropZone = (/** @type {HTMLElement} */ el) => {
      el.style.height = '32px';
      el.classList.add('has-background-primary', 'my-2');
    };

    const resetDropZone = (/** @type {HTMLElement} */ el) => {
      el.style.height = '16px';
      el.classList.remove('has-background-primary', 'my-2');
    };

    const handleDrop = (/** @type {DragEvent} */ e, index) => {
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;

      resetDropZone(e.target);
      vm.reorder(id, index);
      vm.autosave();
    };

    const handleDragover = (/** @type {DragEvent} */ e) => {
      e.dataTransfer.dropEffect = 'move';
      displayAsDropZone(e.target);
    };

    const handleDragleave = (/** @type {DragEvent} */ e) => {
      resetDropZone(e.target)
    };

    const handleArrow = (id, index) => {
      vm.reorder(id, index);
      vm.autosave();
      focusById(id);
    };

    const focusById = (id) => {
      nextTick().then(() => {
        if (list.value === null) return;
  
        const element = list.value.querySelector(`[data-id="${id}"]`);
        if (!element) return;
  
        const btn = element.querySelector('[data-target="drag-handle"]');
        if (!btn) return;
  
        btn.focus();
      });
    };

    return {
      vm,
      list,
      handleGoToProject,
      collapsed,
      handleDrop,
      handleDragover,
      handleDragleave,
      handleArrow,
      focusById
    };
  },

  data() {
    return {}
  },

  template: document.querySelector('#queue-view-template').innerHTML
};

app.component('queue-view', QueueView);
</script>