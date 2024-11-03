<template id="apps-drive-picker-template">
  <aside class="modal" :class="{ 'is-active': show }">
    <div class="modal-background"></div>

    <div class="modal-content">
      <div class="box">
        <div class="columns">
          <div class="column is-narrow">
            <span class="icon">
              <span class="material-symbols-outlined">add_to_drive</span>
            </span>
          </div>

          <div class="column pl-2">
            <p class="subtitle">Pick a File</p>
          </div>

          <div class="column is-pulled-right">
            <progress
              class="progress is-small is-info"
              max="100"
              :class="{ 'is-hidden': !isLoading }"
            >
              100%
            </progress>
          </div>
        </div>

        <div class="breadcrumb" aria-label="breadcrumbs">
          <ul>
            <li v-for="(crumb, index) in breadcrumbs" :key="crumb.folder.id">
              <a @click="goToCrumb(index)">{{ crumb.folder.name }}</a>
            </li>
          </ul>
        </div>

        <div class="control" :class="{ 'is-loading': isLoading }">
          <input
            class="input"
            type="search"
            placeholder="Search files..."
            :disabled="isLoading"
            :value="search"
            @change="onSearchChange"
          />
        </div>

        <div class="container drive-content-list">
          <div
            class="columns pb-2 pt-2 drive-content-border"
            tabindex="0"
            v-for="content in contentList"
            :key="content.id"
            :class="{
              'has-background-info-light': highlightedContent.id === content.id,
              'drive-content-selected': highlightedContent.id === content.id,
            }"
            @click="highlightContent(content)"
            @dblclick="selectContent(content)"
            @keydown="keyboardSelectContent($event, content)"
          >
            <div class="column is-narrow ml-1">
              <span class="icon">
                <span class="material-symbols-outlined">{{ getIconByType(content) }}</span>
              </span>
            </div>

            <div class="column is-one-third">
              {{ shortenMimeType(content.type || "folder") }}
            </div>

            <div class="column">
              {{ content.name }}
            </div>
          </div>
        </div>

        <div class="buttons has-addons mt-4">
          <div class="button is-dark" @click="cancel">Cancel</div>
          <div
            class="button is-warning"
            :disabled="
              !highlightedContent.id || highlightedContent.type === 'Folder'
            "
            @click="selectFile"
          >
            Select file
          </div>
        </div>
      </div>
    </div>

    <button
      class="modal-close is-large"
      aria-label="Close"
      @click="cancel"
    ></button>
  </aside>
</template>

  <style>
.drive-content-list {
  max-height: 50vh;
  overflow-y: auto;
}

.drive-content-border {
  border-bottom: 1px solid gray;
}

.drive-content-selected {
  outline: none;
}
</style>
  
<script>
const AppsDrivePicker = {
  props: {
    show: Boolean,
  },

  emits: ["file-selected", "update:show"],

  setup() {
    return {
      api: store.api,
    };
  },

  data() {
    return {
      search: "",
      isLoading: false,
      highlightedContent: {},
      breadcrumbs: [
        {
          folder: {},
          content: [],
        },
      ],
      cache: {},
      icons: {
        mine: {
          folder: "folder",
          file: "insert_drive_file",
        },
        shared: {
          folder: "folder_shared",
          file: "contact_page",
        },
      },
    };
  },

  methods: {
    selectFile() {
      this.$emit("file-selected", this.highlightedContent);
      this.$emit("update:show", false);
    },
    cancel() {
      this.$emit("update:show", false);
    },
    async onSearchChange(e) {
      //send search request to server
      this.search = e.target.value || "";
      if (this.search.length === 0) return;

      //caching for search results
      if (this.cache[this.search]) {
        this.breadcrumbs = [this.breadcrumbs[0], this.cache[this.search]];
      } else {
        this.isLoading = true;

        const response = await this.api
          .post("/apps-drive-picker/search")
          .promise({ term: this.search });

        const searchResults = {
          folder: {
            id: this.search,
            name: "Search results",
          },
          content: response.body,
        };

        this.cache[this.search] = searchResults;
        this.breadcrumbs = [this.breadcrumbs[0], searchResults];
        this.isLoading = false;
      }
    },
    highlightContent(content) {
      this.highlightedContent = content;
    },
    async selectContent(content) {
      if (
        content.resource === "folder" ||
        content.type === "application/vnd.google-apps.shortcut"
      ) {
        //caching folders
        if (this.cache[content.id]) {
          this.breadcrumbs.push(this.cache[content.id]);
        } else {
          this.isLoading = true;

          const response = await this.api
            .post("/apps-drive-picker/dir")
            .send({ id: content.id });

          const folder = {
            folder: content,
            content: response.body,
          };

          this.cache[content.id] = folder;
          this.breadcrumbs.push(folder);
          this.isLoading = false;
        }
      } else {
        this.selectFile(content);
      }
    },
    keyboardSelectContent(e, content) {
      if (e.key === "Enter") this.selectContent(content);
    },
    goToCrumb(index) {
      this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
    },
    shortenMimeType(mime) {
      const tokens = mime.split(".");
      const doc = tokens[tokens.length - 1];
      const docTokens = doc.split("/");

      return docTokens[docTokens.length - 1];
    },
    getIconByType(content) {
      const shared = content.viewers.length > 1 || content.editors.length > 1;
      const icons = shared ? this.icons.shared : this.icons.mine;

      return icons[content.resource] || "question_mark";
    },
  },

  computed: {
    contentList() {
      if (this.isLoading) return [];

      const lastIndex = this.breadcrumbs.length - 1;
      return this.breadcrumbs[lastIndex].content;
    },
  },

  watch: {
    async show(val) {
      //load root on first show
      if (val && !this.cache.root) {
        this.isLoading = true;
        const response = await this.api.post("/apps-drive-picker/dir").send();

        const folder = {
          folder: {
            id: "root",
            name: "My Drive",
          },
          content: response.body,
        };

        this.breadcrumbs = [folder];
        this.cache["root"] = folder;

        this.isLoading = false;
      }
    },
  },

  template: document.querySelector("#apps-drive-picker-template").innerHTML,
};

app.component("apps-drive-picker", AppsDrivePicker);
</script>