<template id="toggle-project-favorite-template">
  <button
    class="button is-white"
    :class="size"
    :title="vm.isFavorite ? 'Unfavorite project' : 'Favorite project'"
    @click="vm.toggleProjectFavorite"
  >
    <span class="icon" :class="size">
      <span
        v-if="vm.isFavorite"
        class="material-symbols-outlined has-text-link"
        aria-hidden="true"
        >star</span
      >
      <span v-if="!vm.isFavorite" class="material-symbols-outlined" aria-hidden="true"
        >star_border</span
      >
    </span>
  </button>
</template>

<script>
const ToggleProjectFavorite = {
  props: {
    vm: Object,
    size: String,
  },

  template: document.querySelector("#toggle-project-favorite-template").innerHTML,
};

app.component("toggle-project-favorite", ToggleProjectFavorite);
</script>