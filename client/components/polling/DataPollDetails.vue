<template id="data-poll-details-template">
  <article>
    <p><strong>Status: </strong>{{ state.app.polling.status }}</p>
    <p>
      <strong>Session polls: </strong>{{ state.app.polling.sessionPolls }}
    </p>
    <p><strong>Last poll: </strong>{{ state.app.polling.lastUpdate }}</p>
  </article>
</template>

<script>
const DataPollDetails = {
  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  template: document.querySelector("#data-poll-details-template").innerHTML,
};

app.component("data-poll-details", DataPollDetails);
</script>