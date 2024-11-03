<template id="admin-system-log-template">
  <article>
    <ul>
      <li v-for="(log, index) in state.app.logs" :key="index">
        {{ log.at }}
        <span :class="TYPE[log.type] || ''">[{{ log.type }}]</span> &gt;
        {{ log.message }}
      </li>
    </ul>
  </article>
</template>

<script>
const AdminSystemLog = {
  props: {},

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  data() {
    return {
      TYPE: {
        INFO: "has-text-info",
        WARN: "has-text-warning",
        ERROR: "has-text-danger",
      },
    };
  },

  template: document.querySelector("#admin-system-log-template").innerHTML,
};

app.component("admin-system-log", AdminSystemLog);
</script>