<template id="skip-to-main-content-template">

  <article class="skip-to-main-content-container">
    <div class="is-flex is-justify-content-center">
      <a
        :href="hash"
        class="button p-5 skip-to-main-content-link"
        :class="linkClass"
        @click="handleSkipClick"
      >Skip to main content</a>
    </div>
  </article>

</template>

<style>

.skip-to-main-content-container {
  position: absolute;
  pointer-events: none;
  width: 100%;
}

.skip-to-main-content-link {
  opacity: 0;
}

.skip-to-main-content-link:focus {
  opacity: 1;
  pointer-events: all;
  z-index: 1000;
}
</style>

<script>
export default {
  props: {
    to: String,
    linkClass: String
  },

  emits: ['skip-to-main'],

  setup(props, ctx) {
    /** @type {VueOverrides} */
    const {
      computed,
    } = Vue;

    const hash = computed(() =>
      props.to ? `#${String(props.to)}` : '#'
    );

    const handleSkipClick = (e) => {
      e.preventDefault();

      if (hash.value !== '#') {
        const toFocus = document.querySelector(hash.value);
        if (toFocus) {
          const focusable = toFocus.querySelector('a,input,textarea,button,select,radio');
          if (focusable) focusable.focus();
        }
      }

      ctx.emit('skip-to-main');
    };

    return {
      hash,
      handleSkipClick
    };
  },

  data() {
    return {}
  },

  template: document.querySelector('#skip-to-main-content-template').innerHTML
};

app.component('skip-to-main-content', SkipToMainContent);
</script>