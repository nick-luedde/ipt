<template id="split-pane-template">
  <section
    class="height-full"
    ref="container"
  >
    <div
      class="split-pane-columns columns p-0"
      :class="columnsDirection"
    >
      <transition :name="transition">
        <div
          v-show="collapsed !== 'first'"
          class="split-pane-element column is-narrow p-0"
          :class="firstclass"
          :style="firststyle"
        >
          <slot name="first"></slot>
        </div>
      </transition>

      <div
        draggable="true"
        tabindex="0"
        title="Pane separator (Shift + Arrow Keys to resize)"
        aria-label="Pane separator (Shift + Arrow Keys to resize)"
        class="split-pane-separator column is-narrow p-0"
        :style="separatorStyle"
        @click="handleSeparatorClick"
        @keydown="handleSeparatorKeydown"
        @dragstart="handleDragStart"
        @drag="handleSeparatorDrag"
      ></div>

      <transition :name="transition">
        <div
          v-show="collapsed !== 'second'"
          class="split-pane-element column is-narrow p-0"
          :class="secondclass"
          :style="secondstyle"
        >
          <slot name="second"></slot>
        </div>
      </transition>
    </div>
  </section>
</template>

<style>
.hcollapse-enter-active,
.hcollapse-leave-active {
  transition: width 0.5s ease;
}

.hcollapse-enter-from,
.hcollapse-leave-to {
  width: 0;
}

.vcollapse-enter-active,
.vcollapse-leave-active {
  transition: height 0.5s ease;
}

.vcollapse-enter-from,
.vcollapse-leave-to {
  height: 0;
}

@media screen and (min-width: 769px) {
  .split-pane-columns {
    flex-wrap: nowrap;
    height: 100%;
  }
}

@media screen and (max-width: 768px) {
  .split-pane-separator {
    display: none;
  }

  .split-pane-element {
    width: 100% !important;
    display: block !important;
  }
}
</style>

<script>
export default {
  props: {
    horizontal: Boolean,
    firstclass: String,
    secondclass: String,
    collapsed: String,
    initialOffset: {
      type: Number,
      default: 0.5
    },
    cache: String,
    fixed: Boolean
  },

  emits: ['update:collapsed'],

  setup(props, context) {
    const {
      ref,
      computed,
      onMounted,
      onUnmounted,
    } = Vue;

    const container = ref(null);
    const width = ref(0);
    const height = ref(0);
    const separatorWidth = ref(6 + 6 + 4);

    const collapse = (target) => {
      context.emit('update:collapsed', target);
      cacheState(target);
    };

    const cacheState = (collapsed) => {
      if (!props.cache)
        return;

      localStorage.setItem(`_split-pane_${props.cache}`, collapsed || offsetfirst.value);
    };

    const loadCachedState = () => {
      if (!props.cache)
        return null;

      const cached = localStorage.getItem(`_split-pane_${props.cache}`);
      if (cached === null)
        return;

      if (cached === 'first') {
        collapse('first');
      } else if (cached === 'second') {
        collapse('second');
      } else {
        const parsed = parseFloat(cached);
        if (!Number.isNaN(parsed))
          offsetfirst.value = parsed;
      }
    };

    const handleContainerResize = () => {
      width.value = container.value.clientWidth;
      height.value = container.value.clientHeight;
    };

    const boundaryDistance = computed(() => props.horizontal ? height.value : width.value);

    const offsetfirst = ref(props.initialOffset);
    loadCachedState();

    const firstwidth = computed(() => Math.floor((boundaryDistance.value * offsetfirst.value) - separatorWidth.value / 2));
    const secondwidth = computed(() => Math.ceil((boundaryDistance.value * (1 - offsetfirst.value)) - separatorWidth.value / 2));

    const firststyle = computed(() => {
      const dir = props.horizontal ? 'height' : 'width';

      const style = {
        'max-height': '100%',
        'max-width': '100%',
        'overflow': 'auto',
        [dir]: `${firstwidth.value}px`
      };
      if (props.collapsed === 'first')
        style[dir] = 0;
      if (props.collapsed === 'second')
        style[dir] = `${firstwidth.value + secondwidth.value}px`;
      return style;
    });
    const secondstyle = computed(() => {
      const dir = props.horizontal ? 'height' : 'width';

      const style = {
        'max-height': '100%',
        'max-width': '100%',
        'overflow': 'auto',
        [dir]: `${secondwidth.value}px`
      };
      if (props.collapsed === 'second')
        style[dir] = 0;
      if (props.collapsed === 'first')
        style[dir] = `${firstwidth.value + secondwidth.value}px`;

      return style;
    });

    const separatorStyle = computed(() => {
      const h = props.horizontal;

      const style = {
        [`border-${h ? 'bottom' : 'right'}`]: '4px solid var(--light-color)',
        [`margin-${h ? 'top' : 'left'}`]: '6px',
        [`margin-${h ? 'bottom' : 'right'}`]: '6px',
        'cursor': `${h ? 'row' : 'col'}-resize`
      };

      return style;
    });

    const columnsDirection = computed(() => props.horizontal ? 'is-flex-direction-column' : 'is-flex-direction-row');

    const transition = computed(() => props.horizontal ? 'vcollapse' : 'hcollapse');

    const handleCollapseToggle = (target) => {
      const current = props.collapsed === target;
      const toCollapse = current ? '' : target;
      collapse(toCollapse);
    };

    const resizeOffset = (diff) => {
      offsetfirst.value = offsetfirst.value - diff;

      if (offsetfirst.value > 0.9) {
        offsetfirst.value = 0.9;
        collapse('second');
      }

      if (offsetfirst.value < 0.1) {
        offsetfirst.value = 0.1;
        collapse('first');
      }

      cacheState();
    };

    const handleSeparatorClick = () => handleCollapseToggle(offsetfirst.value < 0.5 ? 'first' : 'second');
    const handleSeparatorKeydown = (e) => {
      const { key, shiftKey } = e;

      switch (key) {
        case 'Enter':
          handleCollapseToggle(offsetfirst.value < 0.5 ? 'first' : 'second');
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          if (props.fixed) break;
          if (shiftKey)
            resizeOffset(0.01);
          break;

        case 'ArrowRight':
        case 'ArrowDown':
          if (props.fixed) break;
          if (shiftKey)
            resizeOffset(-0.01);
          break;
      };
    };

    const dragStart = ref(0);
    const handleDragStart = (e) => {
      if (props.fixed) return;

      handleCollapseToggle('');
      const { x, y } = e;
      dragStart.value = props.horizontal ? y : x;
    };

    const handleSeparatorDrag = (e) => {
      if (props.fixed) return;

      const { x, y } = e;
      const measure = props.horizontal ? y : x;

      if (measure === 0)
        return;

      const diff = dragStart.value - measure;
      dragStart.value = measure;
      const ratio = diff / boundaryDistance.value;

      resizeOffset(ratio);
    };

    const handleKeyboardShortcut = (event) => {
      const actions = {
        'ctrl+shift+h': (event) => {
          event.preventDefault();
          handleCollapseToggle(props.collapsed);
        },
      };

      let key = '';

      if (event.ctrlKey)
        key += 'ctrl+';
      if (event.altKey)
        key += 'alt+';
      if (event.shiftKey)
        key += 'shift+';

      key += event.key.toLowerCase();

      const action = actions[key];
      if (action)
        action.call(null, event);
    };

    onMounted(() => {
      document.addEventListener('keydown', handleKeyboardShortcut);
      window.addEventListener('resize', handleContainerResize);
      window.dispatchEvent(new Event('resize'));
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
      window.removeEventListener('resize', handleContainerResize);
    });

    return {
      container,
      handleContainerResize,
      firstwidth,
      secondwidth,
      firststyle,
      secondstyle,
      separatorStyle,
      columnsDirection,
      transition,
      handleCollapseToggle,
      handleSeparatorClick,
      handleSeparatorKeydown,
      handleDragStart,
      handleSeparatorDrag
    };
  },

  template: document.querySelector('#split-pane-template').innerHTML
};

app.component('split-pane', SplitPane);
</script>