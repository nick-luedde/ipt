<template id="timeline-edit-details-template">
  <section>
    <div class="p-3">
      <apps-input
        label="Name"
        size="is-small"
        :schema="vm.validation.schema.name"
        v-model="vm.timeline.name"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="Description"
        size="is-small"
        :schema="vm.validation.schema.description"
        v-model="vm.timeline.description"
        @input="vm.autosave"
      ></apps-input>

      <timeline-project-select :vm="vm"></timeline-project-select>
    </div>

    <div class="columns mb-0">
      <apps-select
        label="Status"
        size="is-small"
        class="column is-narrow pt-0 pb-0"
        :options="state.list.timelineStatuses"
        :schema="vm.validation.schema.status"
        v-model="vm.timeline.status"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        label="Effort"
        size="is-small"
        class="column is-narrow pt-0 pb-0"
        :options="state.list.timelineEfforts"
        :schema="vm.validation.schema.effort"
        v-model.number="vm.timeline.effort"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        label="Priority"
        size="is-small"
        class="column is-narrow pt-0 pb-0"
        :options="state.list.timelinePriorities"
        :schema="vm.validation.schema.priority"
        v-model.number="vm.timeline.priority"
        @change="vm.autosave"
      ></apps-select>

      <apps-select
        label="Magnitude"
        size="is-small"
        class="column is-narrow pt-0 pb-0"
        :options="state.list.timelineMagnitudes"
        :schema="vm.validation.schema.magnitude"
        v-model.number="vm.timeline.magnitude"
        @change="vm.autosave"
      ></apps-select>

      <apps-tags
        label="Impacts"
        size="is-small"
        class="column pt-0 pb-0"
        placeholder="Add impact..."
        tag-color="is-light"
        icon-left="add"
        :suggestions="impactSuggestions"
        :schema="vm.validation.schema.impacts"
        v-model="vm.timeline.impacts"
        @change="vm.autosave"
      ></apps-tags>
    </div>

    <div class="p-3">
      <apps-input
        label="Notes"
        size="is-small"
        :schema="vm.validation.schema.notes"
        v-model="vm.timeline.notes"
        @input="vm.autosave"
      ></apps-input>
    </div>

    <div class="columns mb-0">
      <apps-input
        label="Start date"
        size="is-small"
        class="column pt-0 pb-0"
        :schema="vm.validation.schema.startDate"
        v-model="vm.timeline.startDate"
        @input="vm.autosave"
      ></apps-input>

      <apps-input
        label="End date"
        size="is-small"
        class="column pt-0 pb-0"
        :schema="vm.validation.schema.endDate"
        v-model="vm.timeline.endDate"
        @input="vm.autosave"
      ></apps-input>
    </div>

    <div class="field is-grouped is-grouped-right is-grouped-multiline">
      <div class="control">
        <span class="tags has-addons">
          <span class="tag is-primary">Complexity index</span>
          <span class="tag is-light">{{ vm.complexityIndex }}</span>
        </span>
      </div>
      <div class="control">
        <span class="tags has-addons">
          <span class="tag is-info">Duration</span>
          <span class="tag is-light">{{ vm.duration }}</span>
        </span>
      </div>
      <div class="control">
        <span class="tags has-addons">
          <span class="tag is-warning">Remaining</span>
          <span class="tag is-light">{{ vm.remaining }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<script>
const TimelineEditDetails = {
  props: {
    timeline: Object,
    vm: Object,
  },

  setup(props) {
    const { computed } = Vue;
    const vm = props.vm || useTimelineViewModel(props.timeline);

    const { timelineImpacts } = useListFilters();
    const impactSuggestions = computed(() => timelineImpacts.value.map(t => t.value));

    return {
      vm,
      state: {
        data: store.state.data,
        list: store.state.list,
      },
      impactSuggestions
    };
  },

  computed: {
    users() {
      return this.state.list.users;
    },
  },

  template: document.querySelector("#timeline-edit-details-template")
    .innerHTML,
};

app.component("timeline-edit-details", TimelineEditDetails);
</script>