<template id="last-saved-on-template">
  <span>Last saved: {{ lastSavedOn }}</span>
</template>

<script>
const lastSavedOn = {
  props: {
    rec: Object,
    live: {
      type: Boolean,
      default: true
    }
  },

  setup(props) {
    const { lastSavedOn } = useLastSavedOn(props.rec || {}, { live: props.live });
    
    return {
      lastSavedOn
    };
  },

  template: document.querySelector('#last-saved-on-template').innerHTML
};

app.component('last-saved-on', lastSavedOn);
</script>