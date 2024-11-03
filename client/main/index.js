//setup for vue routing
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    { path: '/projects', component: ProjectsListView, meta: { title: 'Projects', refresh: true } },
    { path: '/project/:id', component: ProjectEditView, props: true, meta: { title: 'Project' } },
    { path: '/inactive-projects', component: InactiveProjectsListView, meta: { title: 'Inactive projects', refresh: true } },
    { path: '/items', component: ItemsListView, meta: { title: 'Items', refresh: true } },
    { path: '/item/:id', component: ItemEditView, props: true, meta: { title: 'Item' } },
    { path: '/queue', component: QueueView, meta: { title: 'Queue', refresh: true } },
    { path: '/timelines-chart', component: TimelinesView, meta: { title: 'Timelines chart', refresh: true } },
    { path: '/timelines', component: TimelinesListView, meta: { title: 'Timelines', refresh: true } },
    { path: '/timeline/:id', component: TimelineEditView, props: true, meta: { title: 'Timeline' } },
    { path: '/settings', component: SettingsView, meta: { title: 'Settings' } },
    { path: '/', component: DashboardTabsView, meta: { title: 'Dashboard', refresh: true } },
    { path: '/:catchAll(.*)', component: { template: '<div class="section"><p class="title">Resource not found!</p></div>' }, meta: { title: 'Not found' } },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { x: 0, y: 0 };
    }
  }
});

//middleware to update store and google history from vue route
router.beforeEach((to, from, next) => {

  const {
    state,
    dispatch
  } = store;

  state.app.currentRoute = to.path;
  state.app.currentQueryParams = to.query;

  if (to.path !== from.path && to.meta.refresh) {
    dispatch.app.loadLatestData();
  }

  state.app.title = to.meta.title;

  // google.script.history.replace({}, to.query, to.path);
  next();

});

/**
 * custom focus directive
 * use: v-focus
 */
app.directive('focus', {

  mounted(el) {

    const focusable = [
      'a',
      'input',
      'select',
      'textarea',
      'button'
    ];

    if (focusable.includes(el.tagName.toLowerCase())) {
      el.focus();
    } else {
      const nearest = el.querySelector(focusable.join(','))
      if (nearest)
        requestAnimationFrame(() => nearest.focus());
    }
  }

});

app.use(router);
const vm = app.mount('#app');