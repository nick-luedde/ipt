<template id="loading-inset-template">
  <div
    class="is-flex-polite is-align-items-center is-flex-direction-column is-justify-content-center"
    style="position: fixed; bottom: 0; top: 0; left: 0; right: 0; z-index: -1;"
  >
    <div
      class="p-1 modal-content"
      style="width: 100%; overflow: hidden"
    >
      <div
        class="bulma-spinner m-auto"
        :class="color"
        :style="{ height: height, width: width }"
      ></div>
    </div>
  </div>
</template>

<script>
const LoadingInset = {
  props: {
    width: {
      type: String,
      default: '64px'
    },
    height: {
      type: String,
      default: '64px'
    },
    color: {
      type: String,
      default: 'has-text-link'
    }
  },

  template: document.querySelector('#loading-inset-template').innerHTML
};

app.component('loading-inset', LoadingInset);
</script>