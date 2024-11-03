<template id="status-bar-template">
  <article class="level" :style="style">
    <div class="level-left">
      <slot name="left"></slot>
    </div>
    <div class="level-right">
      <slot name="right"></slot>
    </div>
  </article>
</template>

<script>
const StatusBar = {
  props: {
    pos: String,
  },

  computed: {
    style() {
      const st = {
        position: "fixed",
        "z-idex": 20,
        width: "100%",
        left: "0px",
        "border-top": "1px solid var(--soft-color)",
      };

      if (this.pos === "bottom") st.bottom = "0px";
      else st.top = "0px";

      return st;
    },
  },

  template: document.querySelector("#status-bar-template").innerHTML,
};

app.component("status-bar", StatusBar);
</script>