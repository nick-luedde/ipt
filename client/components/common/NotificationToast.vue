<template id="notification-toast-template">
  <aside
    class="notification-toast"
    role="status"
    aria-live="polite"
    :style="`bottom: ${bottom};`"
    :class="{ 'is-hidden': !show }"
  >
    <div class="container">
      <div class="notification pt-2 pr-2" :class="color">
        <div class="columns is-vcentered is-1 p-1">
          <div class="column">
            <slot>{{ message }}</slot>
          </div>

          <div class="column is-narrow">
            <button class="button ml-2" :class="color" @click="handleClose">
              {{ caption }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style>
.notification-toast {
  position: fixed;
  width: 100%;
  padding: 1rem;
  left: 0;
  z-index: 1000;
}
</style>

<script>
const NotificationToast = {
  props: {
    message: String,
    show: Boolean,
    bottom: {
      type: String,
      default: "0",
    },
    caption: {
      type: String,
      default: "Dismiss",
    },
    color: {
      type: String,
      default: "is-info",
    },
  },

  setup(props, context) {
    const {
      watch,
      onUnmounted
    } = Vue;

    const handleClose = () => {
      context.emit("update:show", false);
      context.emit("close-notification");
    };
    
    const handler = (e) => {
      console.log('This was the notification toast event handler!');
      if (e.key === 'Escape')
        handleClose();
    };

    watch(() => props.show, (newVal) => {
      if (newVal) {
        document.removeEventListener('keydown', handler);
        document.addEventListener('keydown', handler);
      } else {
        document.removeEventListener('keydown', handler);
      }
    });
    onUnmounted(() => document.removeEventListener('keydown', handler));

    return {
      handleClose
    };
  },

  emits: ["update:show", "close-notification"],

  template: document.querySelector("#notification-toast-template").innerHTML,
};

app.component("notification-toast", NotificationToast);
</script>