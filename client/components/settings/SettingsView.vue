<template id="settings-view-template">
  <main v-if="!!vm" class="container">
    <div class="columns">
      <section class="column">
        <h2 class="title is-6 mb-1">App settings</h2>
        <hr />
        <!-- <apps-select
          label="Theme (reload app to update theme after changing it)"
          size="is-small"
          v-model="vm.user.settings.theme"
          :options="['Light', 'Dark']"
          @change="vm.saveUser"
        ></apps-select> -->

        <!-- <apps-checkbox
          label="Subscribe to item assignment email notifications"
          size="is-small"
          v-model="vm.user.settings.getItemEmailNotifications"
          @change="vm.saveUser"
        ></apps-checkbox> -->
      </section>

      <section class="column">
        <p class="title is-6 mb-1">Other settings...</p>
        <hr />
        <h2 class="subtitle is-7 highlight-border-bottom mb-2">
          Keyboard shortcuts
        </h2>
        <article class="content is-size-7">
          <ul>
            <li><strong>(ctrl + alt + /)</strong> - Go to search</li>
            <li><strong>(ctrl + alt + p)</strong> - Go to my projects</li>
            <li><strong>(ctrl + alt + q)</strong> - Go to queue</li>
            <li><strong>(ctrl + alt + i)</strong> - Go to my items</li>
            <li><strong>(ctrl + alt + c)</strong> - Go to timelines chart</li>
            <li><strong>(ctrl + alt + h)</strong> - Go to home dashboard</li>
            <li><strong>(ctrl + alt + s)</strong> - Go to settings</li>
          </ul>
        </article>
      </section>
    </div>
    <!-- <section class="is-flex is-flex-direction-column" style="max-height: 40vh">
      <admin-system-log
        class="m-2 p-2 light-border"
        style="
          font-family: 'Courier New', Courier, monospace;
          flex-grow: 1;
          flex-shrink: 1;
          overflow-y: auto;
        "
      ></admin-system-log>
    </section> -->
  </main>
</template>

<script>
const SettingsView = {
  setup() {
    const vm = store.state.app.user
      ? useUserViewModel(store.state.app.user)
      : null;

    return {
      vm,
    };
  },

  template: document.querySelector("#settings-view-template").innerHTML,
};

app.component("settings-view", SettingsView);
</script>