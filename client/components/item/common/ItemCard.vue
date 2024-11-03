<template id="item-card-template">
  <article class="card p-0 is-shadowless light-border">
    <div class="card-content p-3">
      <div class="media mb-2">
        <div class="media-left">
          <div class="display-block mb-2">
            <item-type-icon :type="vm.item.type"></item-type-icon>
            <queue-button
              :queued="vm.isQueued"
              @push="vm.pushToQueue"
              @pop="vm.popFromQueue"
            ></queue-button>
          </div>
          <tag-edit-dropdown
            ref="status-tag"
            :value="vm.item.status"
            :options="state.list.statuses"
            :tag-class="vm.itemStatusBulmaTag"
            @option-select="handleStatusSelect"
          ></tag-edit-dropdown>
        </div>
        <div class="media-content overflow-x-inherit">
          <p>
            <a
              class="title is-6 mb-1"
              href="#"
              @click.prevent="handleProjectClick"
            >
              {{ vm.project.name }}
            </a>
          </p>
          <p>
            <a
              class="subtitle is-7"
              href="#"
              @click.prevent="handleItemClick"
            >
              [{{ vm.item.itemNumber }}] - {{ vm.item.name }}
            </a>
          </p>
        </div>
      </div>

      <article>
        <ul>
          <li v-show="showAssignee">
            Assigned: {{ vm.item.assignee }}
          </li>
          <li v-show="!!vm.item.scheduledDate">
            Scheduled: {{ formatScheduledDate(vm.item.scheduledDate) }}
          </li>
        </ul>
      </article>
    </div>
  </article>
</template>

<script>
const ItemCard = {
  props: {
    item: Object,
    showAssignee: {
      type: Boolean,
      default: true
    }
  },

  emits: ["item-click", "project-click"],

  setup(props) {
    const vm = useItemViewModel(props.item);

    return {
      state: {
        list: store.state.list,
      },
      calculated: store.calculated,
      vm,
    };
  },

  methods: {
    handleItemClick() {
      this.$emit("item-click", this.vm.item);
    },
    handleProjectClick() {
      this.$emit("project-click", { project: this.vm.project, item: this.vm.item });
    },
    formatScheduledDate(scheduled) {
      const d = new Date(scheduled);
      return d.toLocaleDateString();
    },
    handleStatusSelect(status) {
      this.vm.autoResolveItemByStatus(status);
    }
  },

  template: document.querySelector("#item-card-template").innerHTML,
};

app.component("item-card", ItemCard);
</script>