<template id="side-menu-content-template">
  <section class="side-menu-content">
    <slot></slot>
  </section>
</template>

<style>
.side-menu-content {
  margin-left: 260px;
}

/* @media (max-width: 768px) { */
@media (max-width: 1024px) {
  .side-menu-content {
    margin-left: 0px;
  }
}
</style>

<script>
const SideMenuContent = {
  template: document.querySelector("#side-menu-content-template").innerHTML,
};

app.component("side-menu-content", SideMenuContent);
</script>