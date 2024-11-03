<template id="side-menu-container-template">
  <div>
    <div
      class="modal-background side-menu-expand-bg"
      style="position: fixed; z-index: 20"
      v-show="expand"
      @click="expand = false"
    ></div>

    <div class="side-menu-expander">
      <button
        class="button is-small is-dark is-radiusless"
        style="width: 100%; height: 64px;"
        :title="expandTitle"
        @click="handleExpand"
      >
        <span class="material-symbols-outlined">{{ icon }}</span>
      </button>
    </div>

    <aside
      class="side-menu-container has-background-white"
      :class="{ 'side-menu-hide': !expand }"
    >
      <slot></slot>
    </aside>
  </div>
</template>

<style>
.side-menu-container {
  position: fixed;
  overflow-y: auto;
  left: 0;
  top: 32px;
  bottom: 0;
  width: 260px;
  border-top: 1px solid gray;
  border-right: 1px solid gray;
  z-index: 20;
}

.side-menu-expander {
  display: none;
  position: fixed;
  opacity: 90%;
  left: 0;
  bottom: 16px; 
  z-index: 21;
}

.side-menu-expand-bg {
  display: none;
}

.side-menu-hide {
  display: inherit;
}

/* @media (max-width: 768px) { */
@media (max-width: 1024px) {
  .side-menu-expander {
    display: inherit;
  }

  .side-menu-hide {
    display: none;
  }

  .side-menu-container {
    width: 60%;
  }

  .side-menu-expand-bg {
    display: inherit;
  }
}
</style>

<script>
const SideMenuContainer = {
  data() {
    return {
      expand: false,
    };
  },

  computed: {
    icon() {
      return this.expand ? "arrow_back_ios" : "arrow_forward_ios";
    },
    expandTitle() {
      return this.expand ? "Hide left menu" : "Expand left menu";
    },
  },

  methods: {
    handleExpand() {
      this.expand = !this.expand;
    },
  },

  template: document.querySelector("#side-menu-container-template").innerHTML,
};

app.component("side-menu-container", SideMenuContainer);
</script>