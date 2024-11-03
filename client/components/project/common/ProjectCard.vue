<template id="project-card-template">
  <article class="card p-0 is-shadowless">
    <div class="card-content p-3">
      <div class="media mb-2">
        <div class="media-left">
          <p>
            <tag-edit-dropdown
              ref="priority-tag"
              :value="vm.project.priority"
              :options="state.list.priorities"
              :tag-class="vm.priorityTag"
              @option-select="
                handlePropSelect({ prop: 'priority', val: $event })
              "
            ></tag-edit-dropdown>
          </p>
          <p>
            <tag-edit-dropdown
              ref="status-tag"
              :value="vm.project.status"
              :options="projectStatusOptions"
              tag-class="is-light"
              @option-select="handlePropSelect({ prop: 'status', val: $event })"
            ></tag-edit-dropdown>
          </p>
          <p>
            <span class="tag">{{ vm.project.program }}</span>
          </p>
        </div>
        <div class="media-content overflow-x-inherit">
          <div class="columns p-0">
            <div class="column p-0">
              <p>
                <a
                  class="title is-6 mb-1"
                  href="#"
                  @click.prevent="handleProjectClick"
                >
                  <span class="icon is-small mr-1">
                    <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                      >edit</span
                    >
                  </span>
                  <span>
                    {{ vm.project.name }}
                  </span>
                </a>
              </p>
              <p class="subtitle is-7 mb-1">
                {{ vm.project.platforms.join(", ") }}
              </p>
              <p class="subtitle is-7 mb-1">
                {{ vm.project.categories.join(", ") }}
              </p>
            </div>

            <div v-show="showDescription" class="column p-0 pl-2">
              {{ vm.project.description }}
            </div>
          </div>
        </div>
        <div class="media-right">
          <toggle-project-favorite
            v-if="showFavorite"
            class="is-pulled-right"
            size="is-small"
            :vm="vm"
          ></toggle-project-favorite>
          <p class="has-text-right is-size-7">v{{ vm.project.version }}</p>
        </div>
      </div>

      <section>
        <ul>
          <li v-show="showOwner">Owner: {{ vm.project.owner }}</li>
          <li v-show="!!vm.project.iteration">
            Iteration date: {{ formatDate(vm.project.iteration) }}
          </li>
          <li v-show="showItemStats">
            Total items: {{ vm.stats.totalItems }} | Pending items:
            {{ vm.stats.pendingItems }}
          </li>
        </ul>
      </section>
      <section class="is-flex is-justify-content-end is-size-7">
        Created: {{ formatDate(vm.project.createdDate) }}
      </section>
    </div>
  </article>
</template>

<script>
const ProjectCard = {
  props: {
    vm: Object,
    project: Object,
    // optional row prop if used as a component table row
    row: Object,
    showOwner: {
      type: Boolean,
      default: true,
    },
    showFavorite: {
      type: Boolean,
      default: true,
    },
    showDescription: {
      type: Boolean,
      default: false,
    },
    showItemStats: {
      type: Boolean,
      default: true,
    },
  },

  emits: ["project-click", "prop-update"],

  setup(props) {
    const proj = props.row ? props.row.project : props.project;
    const existingVm = props.vm || (props.row ? props.row.vm : null);
    const vm = existingVm || useProjectViewModel(proj);

    return {
      state: {
        list: store.state.list,
      },
      vm,
    };
  },

  computed: {
    projectStatusOptions() {
      return this.state.list.projectStatuses.filter(
        (status) => status !== "Inactive"
      );
    },
  },

  methods: {
    handleProjectClick() {
      this.$emit("project-click", this.vm.project);
    },
    formatDate(dt) {
      const d = new Date(dt);
      return d.toLocaleDateString();
    },
    async handlePropSelect({ prop, val }) {
      if (this.vm.project[prop] === val) return;

      const rollbackVal = this.vm.project[prop];
      this.vm.project[prop] = val;

      this.$emit("prop-update", { prop, project: this.vm.project });
      const response = await this.vm.quicksave();
      if (!response) {
        this.vm.project[prop] = rollbackVal;
        this.$emit("prop-update", { prop, project: this.vm.project });
      }
    },
  },

  template: document.querySelector("#project-card-template").innerHTML,
};

app.component("project-card", ProjectCard);
</script>