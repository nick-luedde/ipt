<template id="project-links-edit-template">
  <section>
    <div
      v-for="(link, index) in vm.project.links"
      :key="link.url"
      class="field has-addons mb-1"
    >
      <p class="control is-flex">
        <button
          class="button is-small"
          :class="{
            'is-dark is-outlined': !editIndex[index],
            'is-primary': editIndex[index],
          }"
          style="border: none"
          :title="!editIndex[index] ? 'Edit entry' : 'Cancel edit'"
          @click="handleEdit(index)"
        >
          <span class="icon">
            <span class="material-symbols-outlined has-text-white">edit</span>
          </span>
        </button>
      </p>
      <p
        v-show="!editIndex[index]"
        class="control is-expanded is-size-7 is-flex-polite is-align-items-center ml-2"
      >
        <a
          v-if="link.url.match(/https?:\/\//)"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ link.name || link.url }}</a
        >
        <span v-else>{{ link.name }} - {{ link.url }}</span>
      </p>
      <p v-show="!!editIndex[index]" class="control" style="width: 4.5rem">
        <input
          class="input is-small"
          type="number"
          step="-1"
          aria-label="Sort order"
          placeholder="Sort order"
          :value="index + 1"
          @change="handleReorder(index + 1, $event.target.value)"
        />
      </p>
      <p v-show="!!editIndex[index]" class="control is-expanded">
        <input
          v-model="link.name"
          class="input is-small"
          type="text"
          aria-label="Name"
          placeholder="Name"
          @input="vm.autosave"
        />
      </p>
      <p v-show="!!editIndex[index]" class="control">
        <input
          v-model="link.url"
          class="input is-small"
          type="text"
          aria-label="Url"
          placeholder="Url"
          @input="vm.autosave"
        />
      </p>
      <p class="control">
        <button
          v-show="!!editIndex[index]"
          class="button is-small is-outlined"
          title="Delete entry"
          @click="handleRemove(index)"
        >
          <span class="icon">
            <span class="material-symbols-outlined">clear</span>
          </span>
        </button>
      </p>
    </div>

    <!-- ADD NEW SECTION -->
    <hr />

    <div class="field has-addons">
      <p class="control" style="width: 4.5rem">
        <input
          class="input is-small"
          type="number"
          aria-label="Sort order"
          placeholder="Sort order"
          disabled
          :value="vm.project.links.length + 1"
        />
      </p>
      <p class="control is-expanded">
        <input
          v-model="newElement.name"
          class="input is-small"
          type="text"
          aria-label="Name"
          placeholder="Name"
          :disabled="adding"
        />
      </p>
      <p class="control">
        <input
          v-model="newElement.url"
          class="input is-small"
          type="text"
          aria-label="Url"
          placeholder="Url"
          :disabled="adding"
        />
      </p>
      <p class="control">
        <button
          class="button is-small is-outlined"
          :class="{ 'is-loading': adding }"
          title="New entry"
          @click="handleAdd"
        >
          <span class="icon">
            <span class="material-symbols-outlined">add_link</span>
          </span>
        </button>
      </p>
    </div>
  </section>
</template>

<script>
const ProjectLinksEdit = {
  props: {
    vm: Object,
  },

  data() {
    return {
      adding: false,
      editIndex: {},
      newElement: {
        name: "",
        url: "",
      },
    };
  },

  methods: {
    handleReorder(curI, newI) {
      curI = parseInt(curI) - 1;
      newI = parseInt(newI) - 1;
      this.vm.reorderLink(curI, newI);
      this.vm.autosave();

      const i = Math.min(Math.max(newI, 0), this.vm.project.links.length - 1);
      this.editIndex[curI] = this.editIndex[i];
      this.editIndex[i] = true;
    },
    async handleAdd() {
      const el = this.newElement;
      if (el.name === "" || el.url === "") return;

      this.adding = true;

      const toSave = { ...el };
      this.vm.addLink(toSave);
      el.name = "";
      el.url = "";

      const res = await this.vm.autosave();

      this.adding = false;
    },
    handleEdit(index) {
      this.editIndex[index] = !this.editIndex[index];
    },
    handleRemove(index) {
      this.vm.removeLink(index);
      this.vm.autosave();
    },
  },

  template: document.querySelector("#project-links-edit-template").innerHTML,
};

app.component("project-links-edit", ProjectLinksEdit);
</script>