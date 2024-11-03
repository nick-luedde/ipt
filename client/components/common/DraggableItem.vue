<template id="draggable-item-template">

  <div
    class="is-flex-polite"
    @dragstart="handleDragstart"
    @dragend="handleDragend"
    @drag="handleDrag"
    draggable="true"
  >
    <div class="is-flex is-flex-direction-column">
      <button
        class="button is-small is-radiusless"
        :title="arrowUpTitle || 'Change order up'"
        @click="$emit('arrow-up')"
      >
        <span class="icon">
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >
            arrow_upward
          </span>
        </span>
      </button>
      <button
        data-target="drag-handle"
        class="button is-small is-radiusless is-flex-grow-1"
        :style="{ cursor: dragging ? 'grabbing' : 'grab', height: '100%' }"
        :title="`${handleTitle || 'Re-order item'} (drag or use arrow keys)`"
        @keydown="handleKeydown"
      >
        <span class="icon">
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >
            drag_handle
          </span>
        </span>
      </button>
      <button
        class="button is-small is-radiusless"
        :title="arrowDownTitle || 'Change order down'"
        @click="$emit('arrow-down')"
      >
        <span class="icon">
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >
            arrow_downward
          </span>
        </span>
      </button>
    </div>
    <div class="is-flex-grow-1">
      <slot></slot>
    </div>
  </div>

</template>

<script>
export default {
  props: {
    dragdata: String,
    handleTitle: String,
    arrowUpTitle: String,
    arrowDownTitle: String,
  },

  emits: ['dragstart', 'dragend', 'drag', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right'],

  setup(props, ctx) {
    /** @type {VueOverrides} */
    const {
      ref,
    } = Vue;

    const dragging = ref(false);

    const handleKeydown = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'ArrowUp') {
        ctx.emit('arrow-up', props.dragdata);
      } else if (e.key === 'ArrowDown') {
        ctx.emit('arrow-down', props.dragdata);
      } else if (e.key === 'ArrowLeft') {
        ctx.emit('arrow-left', props.dragdata);
      } else if (e.key === 'ArrowRight') {
        ctx.emit('arrow-right', props.dragdata);
      }
    };

    const handleDrag = (/** @type {InputEvent} */ e) => {
      e.dataTransfer.setData('text/plain', props.dragdata);
      ctx.emit('drag', e);
    };
    const handleDragstart = (/** @type {DragEvent} */ e) => {
      dragging.value = true;
      e.dataTransfer.setData('text/plain', props.dragdata);
      ctx.emit('dragstart', e);
    };
    const handleDragend = (/** @type {DragEvent} */ e) => {
      dragging.value = false;
      ctx.emit('dragend', e);
    };

    return {
      dragging,
      handleKeydown,
      handleDrag,
      handleDragstart,
      handleDragend,
    };
  },

  data() {
    return {}
  },

  template: document.querySelector('#draggable-item-template').innerHTML
};

app.component('draggable-item', DraggableItem);
</script>