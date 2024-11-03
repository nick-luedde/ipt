<template id="item-edit-details-template">
  <div>
    <item-action-bar
      :vm="vm"
      @related-items-select="$emit('related-items-select', $event)"
    ></item-action-bar>

    <parent-higher-breadcrumbs
      class="is-small mb-0"
      :vm="vm"
      @higher-click="handleParentHigherClick"
    ></parent-higher-breadcrumbs>

    <div class="p-3">
      <apps-input
        v-focus
        label="Name"
        size="is-small"
        :schema="vm.validation.schema.name"
        v-model="vm.item.name"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="Description"
        size="is-small"
        :schema="vm.validation.schema.description"
        v-model="vm.item.description"
        @input="vm.autosave"
      ></apps-input>
    </div>

    <div class="columns mb-0">
      <apps-select
        class="column pt-0 pb-0"
        label="Assigned to"
        size="is-small"
        icon-left="person"
        fullwidth
        :options="users"
        :schema="vm.validation.schema.assignee"
        v-model="vm.item.assignee"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        class="column pt-0 pb-0"
        label="Type"
        size="is-small"
        fullwidth
        :options="state.list.types"
        :schema="vm.validation.schema.type"
        v-model="vm.item.type"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        class="column pt-0 pb-0"
        label="Priority"
        size="is-small"
        fullwidth
        :options="state.list.priorities"
        :schema="vm.validation.schema.priority"
        v-model="vm.item.priority"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        class="column pt-0 pb-0"
        label="Status"
        size="is-small"
        fullwidth
        :options="state.list.statuses"
        :schema="vm.validation.schema.status"
        v-model="vm.item.status"
        @change="vm.autosave"
      ></apps-select>
    </div>

    <div class="columns mb-0">
      <div
        v-show="!!vm.item.scheduledDate"
        class="column is-narrow pt-0 pr-0 pb-0"
        style="align-self: center"
      >
        <button
          class="button is-small is-white"
          :class="{ 'is-loading': calendarEvent.loading }"
          :disabled="calendarEvent.loading"
          title="Add to calendar"
          @click="handleAddCalendarEvent"
        >
          <span class="icon">
            <span aria-hidden="true" class="material-symbols-outlined">event</span>
          </span>
        </button>
      </div>

      <apps-input
        label="Scheduled"
        size="is-small"
        class="column pt-0 pb-0"
        :schema="vm.validation.schema.scheduledDate"
        v-model="vm.item.scheduledDate"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="Resolved"
        size="is-small"
        class="column pt-0 pb-0"
        :schema="vm.validation.schema.resolvedDate"
        v-model="vm.item.resolvedDate"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="Closed"
        size="is-small"
        class="column pt-0 pb-0"
        :schema="vm.validation.schema.closedDate"
        v-model="vm.item.closedDate"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="Integration version"
        size="is-small"
        class="column is-narrow pt-0 pb-0"
        :schema="vm.validation.schema.version"
        v-model="vm.item.version"
        @input="vm.autosave"
      ></apps-input>
    </div>

    <div v-show="!vm.isNew" class="columns">
      <div class="column is-7 pt-0 pb-0">
        <div class="columns p-0">
          <apps-input
            label="Hours"
            size="is-small"
            class="column is-narrow pt-0 pb-0 pl-0"
            step="0.05"
            :schema="vm.validation.schema.hours"
            v-model="vm.item.hours"
            @input="vm.autosave"
          ></apps-input>

          <apps-tags
            label="Tags"
            size="is-small"
            class="column pt-0 pb-0 pr-0"
            placeholder="New item tag..."
            icon-left="add"
            :debounce="75"
            :suggestions="tagSuggestions"
            :schema="vm.validation.schema.tags"
            v-model="vm.item.tags"
            @change="vm.autosave"
          ></apps-tags>
        </div>

        <item-comment-edit :vm="vm"></item-comment-edit>
      </div>

      <div class="column">
        <apps-file-input
          label="Files"
          size="is-small"
          :maxsize="1024 * 1024 * 100"
          :schema="vm.validation.schema.files"
          v-model="vm.item.files"
          :asyncselect="vm.uploadFile"
          @change="vm.autosave"
        ></apps-file-input>

        <drive-file-url-input
          size="is-small"
          :loading="drivelUrlLoading"
          @url-select="handleDriveUrlSelect"
        ></drive-file-url-input>

        <item-related-edit
          :vm="vm"
          @open-item="$emit('open-item', $event)"
          @new-item="$emit('new-item', $event)"
        ></item-related-edit>
      </div>
    </div>

    <notification-toast
      v-model:show="calendarEvent.show"
      :color="calendarEvent.color"
    >
      <span>
        {{ calendarEvent.message }}
        <a
          v-if="calendarEvent.url"
          :href="calendarEvent.url"
          target="_blank"
          rel="noopener noreferrer"
          >Open event</a
        >
      </span>
    </notification-toast>
  </div>
</template>

<script>
const ItemEditDetails = {
  props: {
    item: Object,
  },

  emits: ["open-item", "new-item", "related-items-select"],

  setup(props) {
    const { computed } = Vue;
    const vm = useItemViewModel(props.item);

    const { itemTags } = useListFilters();
    const tagSuggestions = computed(() => itemTags.value.map(t => t.value));

    return {
      vm,
      tagSuggestions,
      state: {
        data: store.state.data,
        list: store.state.list,
      },
    };
  },

  data() {
    return {
      drivelUrlLoading: false,
      calendarEvent: {
        show: false,
        url: "",
        color: "is-info",
        message: "",
      },
    };
  },

  computed: {
    users() {
      return this.state.list.users;
    },
  },

  methods: {
    async handleAddCalendarEvent() {
      this.calendarEvent.loading = true;
      const response = await this.vm.addToCalendar();

      if (response) {
        const { htmlLink } = response.body;
        this.calendarEvent.url = htmlLink;
        this.calendarEvent.message = "New calendar event created!";
        this.calendarEvent.color = "is-success";
      } else {
        this.calendarEvent.url = "";
        this.calendarEvent.message = "Failed to create calendar event!";
        this.calendarEvent.color = "is-danger";
      }

      this.calendarEvent.loading = false;
      this.calendarEvent.show = true;
    },
    handleParentHigherClick(higher) {
      this.$emit("open-item", higher.id);
    },
    async handleDriveUrlSelect(url) {
      if (url) {
        this.drivelUrlLoading = true;
        await this.vm.attachDriveFileDetails(url);
        this.drivelUrlLoading = false;
      }
    },
  },

  template: document.querySelector("#item-edit-details-template").innerHTML,
};

app.component("item-edit-details", ItemEditDetails);
</script>