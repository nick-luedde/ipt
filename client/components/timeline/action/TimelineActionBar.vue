<template id="timeline-action-bar-template">
  <section class="columns p-0">
    <article class="column p-1">
      <p>
        <span class="is-size-7">
          Created: {{ createdDisplay }} | <last-saved-on :rec="vm.timeline"></last-saved-on>
        </span>
      </p>
    </article>

    <div class="column is-narrow p-1">
      <button
        v-show="!vm.isNew"
        class="button is-danger is-outlined is-small"
        title="Delete project"
        ref="deleteButton"
        @click="handleDelete"
      >
        <span class="icon is-small">
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script>
const TimelineActionBar = {
  props: {
    vm: Object,
  },

  setup() {
    return {};
  },

  data() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  computed: {
    createdDisplay() {
      const date = this.vm.timeline.createdDate;
      if (!date) return "unknown";

      return new Date(date).toLocaleDateString();
    }
  },

  methods: {
    handleDelete() {
      const confirm = this.state.app.confirm;

      confirm.title = "Delete timeline";
      confirm.description = "Are you sure you want to delete this timeline?";
      confirm.caption = "Delete";
      confirm.confirmClasses = "is-danger";

      confirm.action = async () => await this.vm.deleteTimeline();
      confirm.cancel = () => this.$refs.deleteButton.focus();

      confirm.show = true;
    },
  },

  template: document.querySelector("#timeline-action-bar-template").innerHTML,
};

app.component("timeline-action-bar", TimelineActionBar);
</script>