<template id="panel-input-list-template">
  <article class="panel is-shadowless light-border" :class="color">
    <p class="panel-heading">{{ heading }}</p>
    <div v-for="(item, i) in modelValue" :key="item" class="panel-block">
      <div class="field has-addons" style="width: 100%">
        <div class="control is-expanded">
          <input
            class="input"
            type="text"
            :value="item"
            :disabled="!editable"
            @keydown="handleUpdateKeyDown(i, $event)"
            @change="handleItemUpdate(i, $event)"
          />
        </div>
        <div v-show="confirmIndex !== i" class="control">
          <button
            ref="delete"
            class="button is-danger"
            title="Delete"
            :disabled="!editable"
            @click="showConfirm(i)"
          >
            <span class="icon">
              <span class="material-symbols-outlined">delete</span>
            </span>
          </button>
        </div>
        <div v-show="confirmIndex === i" class="control">
          <button
            ref="cancel"
            class="button"
            title="Cancel delete"
            @click="cancelConfirm(i)"
          >
            <span class="icon">
              <span class="material-symbols-outlined">close</span>
            </span>
          </button>
        </div>
        <div v-show="confirmIndex === i" class="control">
          <button
            class="button is-danger"
            title="Confirm delete"
            @click="handleItemDelete(i)"
          >
            <span class="icon">
              <span class="material-symbols-outlined">done</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="panel-block">
      <p class="control has-icons-left">
        <input
          class="input"
          type="text"
          :placeholder="newPlaceholder"
          :disabled="!editable"
          v-model="newItemText"
          @keydown="handleNewItemKeydown"
          @change="handleNewItem"
        />
        <span class="icon is-left">
          <span class="material-symbols-outlined">add</span>
        </span>
      </p>
    </div>
  </article>
</template>

<script>
const PanelInputList = {
  props: {
    heading: String,
    modelValue: Array,
    color: String,
    newPlaceholder: String,
    editable: {
      type: Boolean,
      default: true
    }
  },

  emits: ["input", "change", "update:modelValue"],

  data() {
    return {
      newItemText: "",
      confirmIndex: null
    };
  },

  methods: {
    handleUpdateKeyDown(index, e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleItemUpdate(index, e);
      }
    },
    handleItemUpdate(index, e) {
      this.modelValue.splice(index, 1, e.target.value);
      this.$emit("update:modelValue", this.modelValue);
      this.$emit("change", this.modelValue);
    },
    handleItemDelete(index) {
      this.modelValue.splice(index, 1);
      this.confirmIndex = null;
      this.$emit("update:modelValue", this.modelValue);
      this.$emit("change", this.modelValue);
    },
    handleNewItemKeydown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleNewItem();
      }
    },
    handleNewItem() {
      this.modelValue.push(this.newItemText);
      this.newItemText = "";
      this.$emit("update:modelValue", this.modelValue);
      this.$emit("change", this.modelValue);
    },
    showConfirm(i) {
      this.confirmIndex = i;
      const cancel = this.$refs.cancel[i];
      this.$nextTick(() => cancel.focus());
    },
    cancelConfirm(i) {
      this.confirmIndex = null;
      const del = this.$refs.delete[i];
      this.$nextTick(() => del.focus());
    }
  },

  template: document.querySelector("#panel-input-list-template").innerHTML,
};

app.component("panel-input-list", PanelInputList);
</script>