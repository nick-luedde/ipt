<template id="loading-overlay-template">
  <aside
    class="modal"
    role="dialog"
    aria-live="polite"
    :class="{ 'is-active': show }"
  >
    <div class="modal-background"></div>
    <div class="modal-content" style="width: 100%; overflow: hidden">
      <h1
        class="title theme-independent-white-font is-family-code is-size-1 has-text-centered"
      >
        Loading...
      </h1>
      <div class="loading-overlay-indicator"></div>
    </div>
  </aside>
</template>

<style>
.loading-overlay-indicator {
  background-color: cornflowerblue;
  width: 100px;
  height: 10px;

  -webkit-animation: 3s ease-in-out 0s infinite loading;
  animation: 3s ease-in-out 0s infinite loading;
}

@-webkit-keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(45vw);
  }
  100% {
    transform: translateX(100vw);
  }
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(45vw);
  }
  100% {
    transform: translateX(100vw);
  }
}
</style>

<script>
const LoadingOverlay = {
  props: {
    show: Boolean,
  },

  template: document.querySelector("#loading-overlay-template").innerHTML,
};

app.component("loading-overlay", LoadingOverlay);
</script>