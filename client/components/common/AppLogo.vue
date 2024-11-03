<template id="app-logo-template">
  <figure class="image">
    <span class="icon ml-0">
      <span aria-hidden="true" class="material-symbols-outlined">
        stacks
      </span>
    </span>
  </figure>
</template>

<script>
const AppLogo = {
  template: document.querySelector("#app-logo-template").innerHTML,
};

app.component("app-logo", AppLogo);
</script>