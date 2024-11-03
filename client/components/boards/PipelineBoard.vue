<template id="pipeline-board-template">
  <div class="columns is-multiline">
    <section class="column is-4 p-1">
      <div class="p-3 height-full has-background-light border-radius">
        <component
          :is="heading"
          class="
            title
            is-5
            mb-1
            pb-2
            pt-1
            sticky-header
            has-small-tabs has-background-light
          "
        >
          Backlog ({{ vm.backlogProjects.length }})
        </component>

        <project-card
          v-for="project in vm.sortProjectByPriority(vm.backlogProjects)"
          :key="project.id"
          ref="projectRefs"
          :project="project"
          :show-owner="showOwner"
          class="mb-2 light-border"
          @project-click="handleGoToProject"
          @prop-update="handleFocusUpdate"
        ></project-card>
      </div>
    </section>
    <section class="column is-4 p-1">
      <div class="p-3 height-full has-background-light border-radius">
        <component
          :is="heading"
          class="
            title
            is-5
            mb-1
            pb-2
            pt-1
            sticky-header
            has-small-tabs has-background-light
          "
        >
          Planning ({{ vm.planningProjects.length }})
        </component>

        <project-card
          v-for="project in vm.sortProjectByPriority(vm.planningProjects)"
          :key="project.id"
          ref="projectRefs"
          :project="project"
          :show-owner="showOwner"
          class="mb-2 light-border"
          @project-click="handleGoToProject"
          @prop-update="handleFocusUpdate"
        ></project-card>
      </div>
    </section>
    <section class="column is-4 p-1">
      <div class="p-3 height-full has-background-light border-radius">
        <component
          :is="heading"
          class="
            title
            is-5
            mb-1
            pb-2
            pt-1
            sticky-header
            has-small-tabs has-background-light
          "
        >
          Development ({{ vm.developmentProjects.length }})
        </component>

        <project-card
          v-for="project in vm.sortProjectByPriority(vm.developmentProjects)"
          :key="project.id"
          ref="projectRefs"
          :project="project"
          :show-owner="showOwner"
          class="mb-2 light-border"
          @project-click="handleGoToProject"
          @prop-update="handleFocusUpdate"
        ></project-card>
      </div>
    </section>
    <section class="column is-4 p-1">
      <div class="p-3 height-full has-background-light border-radius">
        <component
          :is="heading"
          class="
            title
            is-5
            mb-1
            pb-2
            pt-1
            sticky-header
            has-small-tabs has-background-light
          "
        >
          Testing ({{ vm.testingProjects.length }})
        </component>

        <project-card
          v-for="project in vm.sortProjectByPriority(vm.testingProjects)"
          :key="project.id"
          ref="projectRefs"
          :project="project"
          :show-owner="showOwner"
          class="mb-2 light-border"
          @project-click="handleGoToProject"
          @prop-update="handleFocusUpdate"
        ></project-card>
      </div>
    </section>
    <section class="column p-1">
      <div class="p-3 height-full has-background-light border-radius">
        <component
          :is="heading"
          class="
            title
            is-5
            mb-1
            pb-2
            pt-1
            sticky-header
            has-small-tabs has-background-light
          "
        >
          Stable ({{ vm.stableProjects.length }})
        </component>

        <project-card
          v-for="project in vm.sortProjectByPriority(vm.stableProjects)"
          :key="project.id"
          ref="projectRefs"
          :project="project"
          :show-owner="showOwner"
          class="mb-2 light-border"
          @project-click="handleGoToProject"
          @prop-update="handleFocusUpdate"
        ></project-card>
      </div>
    </section>
  </div>
</template>

<script>
const PipelineBoard = {
  props: {
    vm: Object,
    showOwner: {
      type: Boolean,
      default: true,
    },
    heading: {
      type: String,
      default: 'h1'
    },
  },

  methods: {
    handleGoToProject(project) {
      this.$router.push(`/project/${project.id}`);
    },
    handleFocusUpdate({ prop, project }) {
      this.$nextTick().then(() => {
        const card = this.$refs.projectRefs.find(
          (projectRef) => projectRef.project.id === project.id
        );
        if (card) {
          const tag = card.$refs[`${prop}-tag`];
          if (tag && typeof tag.publicFocusTag === "function")
            tag.publicFocusTag();
        }
      });
    },
  },

  template: document.querySelector("#pipeline-board-template").innerHTML,
};

app.component("pipeline-board", PipelineBoard);
</script>