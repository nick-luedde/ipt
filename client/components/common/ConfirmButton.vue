<template id="confirm-button-template">
  <div class="field" :class="{ 'has-addons': showConfirm }">
    <div class="control" v-if="!showConfirm">
      <button
        class="button"
        ref="show"
        :class="[
          classes || '',
          size || '',
          { 'is-fullwidth': fullwidth, 'is-radiusless': radiusless },
        ]"
        :title="hoverTitle"
        :disabled="disabled"
        @click="handleShowConfirm"
      >
        <slot></slot>
      </button>
    </div>
    <div
      class="control"
      :class="{ 'is-expanded': fullwidth }"
      v-if="showConfirm"
    >
      <button
        class="button"
        ref="confirm"
        :class="[
          size || '',
          confirmcolor,
          { 'is-fullwidth': fullwidth, 'is-radiusless': radiusless },
        ]"
        @click="handleConfirm"
      >
        {{ confirm }}
      </button>
    </div>
    <div class="control" v-if="showConfirm">
      <button
        class="button"
        ref="cancel"
        :class="[size || '', , { 'is-radiusless': radiusless }]"
        @click="handleCancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
const ConfirmButton = {
  props: {
    classes: String,
    size: String,
    confirm: {
      type: String,
      default: "Confirm",
    },
    hoverTitle: String,
    confirmcolor: {
      type: String,
      default: "is-info",
    },
    disabled: Boolean,
    fullwidth: Boolean,
    radiusless: Boolean,
  },

  emits: ["confirm"],

  data() {
    return {
      showConfirm: false,
    };
  },

  methods: {
    handleShowConfirm() {
      this.showConfirm = true;
      this.$nextTick(() => this.$refs.confirm && this.$refs.confirm.focus());
    },
    handleCancel() {
      this.showConfirm = false;
      this.$nextTick(() => this.$refs.show && this.$refs.show.focus());
    },
    handleConfirm() {
      this.handleCancel();
      this.$emit("confirm");
    },
  },

  template: document.querySelector("#confirm-button-template").innerHTML,
};

app.component("confirm-button", ConfirmButton);
</script>