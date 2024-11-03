<template id="bulma-spinner-template">
  <div role="figure" class="bulma-spinner" :style="style"></div>
</template>

<script>
const BulmaSpinner = {
  props: {
    color: String,
  },

  computed: {
    style() {
      if (!this.color) return {};

      return {
        "border-left-color": this.color,
        "border-bottom-color": this.color,
      };
    },
  },

  template: document.querySelector("#bulma-spinner-template").innerHTML,
};

app.component("bulma-spinner", BulmaSpinner);
</script>