/**
 * setup vue app
 */
//TODO: handle this more gracefully within VueRouter
//I think this is technically a race condition with the vm.mounted() function, but im pretty confident this will win every time haha
// let initLocation = window.location;
// google.script.url.getLocation(location => {
//   console.log('location', location);
//   initLocation = location;
// });

const app = Vue.createApp({
  // data() {},

  async mounted() {
    // //init dispatch with root vue ref;

    const {
      state,
      dispatch,
    } = store;

    state.app.showLoadingOverlay = true;

    // DEPRECATED AS NOT NEEDED WITH REFACTOR TO LOADING USER DIRECTLY TO STORE VIA SERVER TEMPLATE RENDERING
    // dispatch.app.loadAppInit({ bypassWorkingQueue: true });
    await dispatch.app.loadAppData({ bypassWorkingQueue: true });

    // const {
    //   parameter,
    //   hash
    // } = initLocation;

    // initLocation.

    //navigate based on provided route and params
    // if (hash) {
    //   this.$router.push({ path: hash, query: parameter });
    // } else {
    //   this.$router.push('/');
    // }

    state.app.showLoadingOverlay = false;

    IspKeyboardShortcuts(this).connect();
  },

  // computed: {},

  // methods: {}

  // watch: {},

});