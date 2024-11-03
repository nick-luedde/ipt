<template id="confirm-modal-template">
  <aside class="modal" :class="{ 'is-active': show }">
    <div class="modal-background"></div>

    <div class="modal-content">
      <div class="box">
        <p class="subtitle">{{ title || "Action warning" }}</p>
        <p class="content">{{ description || "Are you sure?" }}</p>

        <div class="buttons has-addons is-right">
          <button
            class="button"
            :class="confirmClasses"
            ref="confirm"
            @click="doConfirmAction"
            @keydown="handleKeydown($event, 'cancel')"
          >
            {{ confirmCaption || "Confirm" }}
          </button>
          <button
            class="button is-dark is-outlined"
            ref="cancel"
            @click="doCancelAction"
            @keydown="handleKeydown($event, 'confirm')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
const ConfirmModal = {
  props: {
    show: Boolean,
    confirmAction: Function,
    cancelAction: Function,
    confirmClasses: [Object, Array, String],
    title: String,
    description: String,
    confirmCaption: String,
  },

  emits: ["close", "update:show"],

  mounted() {
    const confirm = this.$refs.confirm;

    this.$nextTick(() => confirm.focus());
  },

  methods: {
    handleKeydown(e, tabTo) {
      if (e.key === "Tab") {
        e.preventDefault();
        this.$refs[tabTo].focus();
      }
    },
    doConfirmAction() {
      if (typeof this.confirmAction === "function") this.confirmAction();

      this.close();
    },
    doCancelAction() {
      if (typeof this.cancelAction === "function") this.cancelAction();

      this.close();
    },
    close() {
      this.$emit("update:show", false);
      this.$emit("close");
    },
  },

  template: document.querySelector("#confirm-modal-template").innerHTML,
};

app.component("confirm-modal", ConfirmModal);
</script>