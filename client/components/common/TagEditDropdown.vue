<template id="tag-edit-dropdown-template">
  <div class="dropdown" :class="{ 'is-active': isActive }">
    <div class="dropdown-trigger">
      <span
        ref="tag"
        :role="enabled ? 'button' : 'generic'"
        :aria-haspopup="enabled ? true : ''"
        :tabindex="enabled ? 0 : ''"
        class="tag"
        :class="[tagClass, { 'is-clickable highlight-link-outline': enabled }]"
        @click="handleIsActive"
        @keydown="handleKeydown"
        >{{ value }}</span
      >
    </div>
    <div class="dropdown-menu">
      <div class="dropdown-content">
        <a
          v-for="option in options"
          :key="option"
          href="#"
          class="dropdown-item is-size-7"
          :class="{ 'is-active': option === value }"
          @click.prevent="handleOptionClick(option)"
        >
          {{ option }}
        </a>
      </div>
    </div>
  </div>
</template>

<script>
const TagEditDropdown = {
  props: {
    value: String,
    options: Array,
    tagClass: [String, Object],
    enabled: {
      type: Boolean,
      default: true,
    },
  },

  emits: ["option-select"],

  data() {
    return {
      isActive: false,
    };
  },

  methods: {
    handleIsActive() {
      if (!this.enabled) this.isActive = false;
      this.isActive = !this.isActive;
    },
    handleKeydown(e) {
      if (e.key === "Enter") this.handleIsActive();
    },
    handleOptionClick(selectedOption) {
      this.$emit("option-select", selectedOption);
      this.isActive = false;
    },
    /**
     * Designed to be used by public ref to this component
     */
    publicFocusTag() {
      if (!this.enabled)
        return;

      this.$refs.tag.scrollIntoView({ behavior: 'smooth' });
      this.$refs.tag.focus();
    }
  },

  template: document.querySelector("#tag-edit-dropdown-template")
    .innerHTML,
};

app.component("tag-edit-dropdown", TagEditDropdown);
</script>