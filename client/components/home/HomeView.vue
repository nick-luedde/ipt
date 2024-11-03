<template id="home-view-template">
  <main class="section">
    <div class="container">
      <h1 class="title">
        <span class="icon is-large"
          ><span aria-hidden="true" class="material-symbols-outlined">list_alt</span></span
        >
        Information Services projects and work item tracking
      </h1>

      <div class="message is-warning">
        <div class="message-body">
          This system is under development!
        </div>
      </div>

      <div class="content">
        Keeping track of your projects and whatnot...
      </div>
    </div>
  </main>
</template>

<script>
const HomeView = {
  template: document.querySelector("#home-view-template").innerHTML,
};

app.component("home-view", HomeView);
</script>