<template id="item-type-icon-template">
  <span class="icon">
    <span aria-hidden="true" class="material-symbols-outlined" :class="[icon.color, iconClass]">{{
      icon.name
    }}</span>
  </span>
</template>

<script>
const ItemTypeIcon = {
  props: {
    type: String,
    iconClass: String
  },

  computed: {
    icon() {
      switch (this.type) {
        case "Bug":
          return { name: "bug_report", color: "has-text-danger" };
        case "Issue":
          return { name: "warning", color: "has-text-warning" };
        case "Enhancement":
          return { name: "code", color: "has-text-link" };
        case "Feature":
          return { name: "account_tree", color: "has-text-primary" };
        case "Epic":
          return { name: "deployed_code", color: "purple-text" };
        case "Story":
          return { name: "history_edu", color: "has-text-info" };
        case "Task":
          return { name: "build_circle", color: "has-text-dark" };
        case "Accessibility":
          return { name: "accessibility", color: "has-text-link" };
        case "Planning":
          return { name: "edit_note", color: "has-text-info" };
        case "Support":
          return { name: "help_center", color: "has-text-success" };
        default:
          return { name: "eco", color: "has-text-light" };
      }
    },
  },

  template: document.querySelector("#item-type-icon-template").innerHTML,
};

app.component("item-type-icon", ItemTypeIcon);
</script>