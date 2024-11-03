<template id="main-view-template">
  <div class="is-size-7-polite is-flex is-flex-direction-column" style="height: 100%">
    <header>
      <skip-to-main-content
        style="top: 0;"
        to="main-content"
        link-class="is-dark"
      ></skip-to-main-content>
      <nav-bar></nav-bar>
    </header>

    <div id="main-content" class="main-content">
      <router-view :key="$route.path"></router-view>
    </div>

    <notification-toast
      :show="state.app.errorMessage ? true : false"
      :message="state.app.errorMessage"
      @close-notification="state.app.errorMessage = ''"
      :color="'is-danger'"
    ></notification-toast>

    <notification-toast
      :show="state.app.appMessage ? true : false"
      :message="state.app.appMessage"
      @close-notification="state.app.appMessage = ''"
      :color="'is-dark'"
    ></notification-toast>

    <confirm-modal
      v-if="state.app.confirm.show"
      v-focus
      v-model:show="state.app.confirm.show"
      :title="state.app.confirm.title"
      :description="state.app.confirm.description"
      :confirm-caption="state.app.confirm.caption"
      :confirm-classes="state.app.confirm.confirmClasses"
      :confirm-action="state.app.confirm.action"
      :cancel-action="state.app.confirm.cancel"
      @close="handleConfirmClose"
    >
    </confirm-modal>

    <loading-overlay
      v-model:show="state.app.showLoadingOverlay"
    ></loading-overlay>

    <footer class="main-footer border-top is-size-7 is-justify-content-end">
      <a
        href="https://github.com/nick-luedde"
        class="mx-2"
        style="display: block;"
        target="_blank"
        rel="noopener noreferrer"
      >
        Check out more from me
      </a>
    </footer>
  </div>
</template>

<script>
const MainView = {
  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  methods: {
    handleConfirmClose() {
      const confirm = this.state.app.confirm;

      confirm.show = false;
      confirm.title = "";
      confirm.description = "";
      confirm.caption = "";
      confirm.confirmClasses = "";
      confirm.action = null;
      confirm.cancel = null;
    },
  },

  template: document.querySelector("#main-view-template").innerHTML,
};

app.component("main-view", MainView);
</script>