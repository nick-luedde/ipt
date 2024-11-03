<template id="drive-file-url-input-template">
  <div class="field has-addons">
    <div class="control">
      <button
        class="button"
        :class="[size, { 'is-primary': expanded, 'is-loading': loading }]"
        title="Add drive file by url"
        :disabled="loading"
        @click="handleDriveFileClick"
      >
        <span class="icon">
          <span class="material-symbols-outlined">add_to_drive</span>
        </span>
      </button>
    </div>
    <div v-show="expanded" class="control is-expanded">
      <input
        ref="urlinput"
        class="input"
        aria-label="Drive file url"
        placeholder="https://docs.google.com..."
        :class="size"
        :disabled="loading"
        v-model="url"
        @keydown="handleUrlKeydown"
      />
    </div>
    <div v-show="expanded" class="control">
      <button
        class="button"
        title="Attach file"
        :class="size"
        :disabled="loading"
        @click="handleAddClick"
      >
        <span class="icon">
          <span class="material-symbols-outlined">attachment</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script>
const DriveFileUrlInput = {
  props: {
    size: {
      type: String,
      default: "is-small",
    },
    loading: false,
  },

  emits: ["url-select"],

  setup() {
    return {};
  },

  data() {
    return {
      url: "",
      expanded: false,
    };
  },

  methods: {
    handleDriveFileClick() {
      this.expanded = !this.expanded;
      this.$nextTick().then(() => this.$refs.urlinput.focus());
    },
    handleUrlKeydown(e) {
      if (e.key === "Enter") this.handleAddClick();
    },
    handleAddClick() {
      if (!this.url) return;
      this.$emit("url-select", this.url);
      this.url = "";
      this.expanded = false;
    },
  },

  template: document.querySelector("#drive-file-url-input-template").innerHTML,
};

app.component("drive-file-url-input", DriveFileUrlInput);
</script>