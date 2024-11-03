<template id="nav-bar-title-template">
  <article class="has-text-centered" style="overflow-x: clip; width: 100%">
    {{ title }}
  </article>
</template>

<script>
const NavBarTitle = {
  props: {
    title: String,
  },

  template: document.querySelector("#nav-bar-title-template").innerHTML,
};

app.component("nav-bar-title", NavBarTitle);
</script>