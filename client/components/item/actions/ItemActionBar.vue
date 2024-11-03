<template id="item-action-bar-template">
  <article class="columns is-mobile mb-0">
    <div class="column p-0">
      <span class="icon-text">
        <item-type-icon :type="vm.item.type"></item-type-icon>
        <span v-show="!vm.isNew" class="is-size-7">
          <span
            class="tag is-small has-text-weight-bold"
            :class="vm.itemStatusBulmaTag"
          >
            [{{ vm.item.itemNumber }}]
          </span>
          Created: {{ createdDisplay }} | <last-saved-on :rec="vm.item"></last-saved-on>
        </span>
      </span>
    </div>

    <div class="column is-narrow p-0">
      <div v-show="!vm.isNew" class="buttons">
        <button
          v-show="vm.higherOrderType"
          class="button is-white is-small"
          title="Open related items"
          @click="handledRelatedItemListClick"
        >
          <span class="icon">
            <span aria-hidden="true" class="material-symbols-outlined">
              format_list_bulleted
            </span>
          </span>
        </button>
        <!-- TODO: hook up emailing maybe? -->
        <!-- <button class="button is-white is-small" title="Email item">
          <span class="icon is-small">
            <span class="material-symbols-outlined" aria-hidden="true">email</span>
          </span>
        </button> -->
        <button
          class="button is-white is-small"
          title="Delete item"
          ref="deleteButton"
          @click="handleDelete"
        >
          <span class="icon is-small">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </span>
        </button>

        <!-- QUEUE -->
        <queue-button
          :queued="vm.isQueued"
          @push="vm.pushToQueue"
          @pop="vm.popFromQueue"
        ></queue-button>

        <div
          class="dropdown is-right"
          :class="{ 'is-active': showMoreOptions }"
        >
          <div class="dropdown-trigger">
            <button
              class="button is-white is-small"
              aria-haspopup="true"
              title="More options"
              @click="showMoreOptions = !showMoreOptions"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined">
                  more_horiz
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu">
            <div class="dropdown-content">
              <div v-if="showMoreOptions" class="dropdown-item">
                <apps-select
                  size="is-small"
                  label="Assigned project"
                  :options="projectOptions"
                  @change="vm.autosave"
                  v-model="vm.item.project"
                ></apps-select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script>
export default {
  props: {
    vm: Object,
  },

  emits: ["item-delete", "related-items-select"],

  setup() {
    return {
      state: {
        app: store.state.app,
        data: store.state.data,
      },
      calculated: store.calculated
    };
  },

  data() {
    return {
      showMoreOptions: false,
    };
  },

  computed: {
    projectOptions() {
      return this.state.data.projects
        .sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1))
        .map((proj) => ({ value: proj.id, text: proj.name }));
    },
    createdDisplay() {
      const date = this.vm.item.createdDate;
      if (!date) return "unknown";

      return new Date(date).toLocaleDateString();
    },
  },

  methods: {
    handleDelete() {
      const confirm = this.state.app.confirm;
      const context = this;

      confirm.title = "Delete item";
      confirm.description = "Are you sure you want to delete this item?";
      confirm.caption = "Delete";
      confirm.confirmClasses = "is-danger";

      confirm.action = async () => {
        await context.vm.deleteItem();
        context.$emit("item-delete");
      };
      confirm.cancel = () => context.$refs.deleteButton.focus();

      confirm.show = true;
    },
    handledRelatedItemListClick() {
      this.$emit("related-items-select", this.vm.item);
    },
    handleReassignItemClick() {},
  },

  template: document.querySelector("#item-action-bar-template").innerHTML,
};

app.component("item-action-bar", ItemActionBar);
</script>