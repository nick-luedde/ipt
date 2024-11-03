<template id="nav-bar-template">
  <nav
    ref="nav"
    style="min-height: auto; height: 32px"
    class="navbar is-fixed-top is-size-7 nav-border-ef002"
    role="navigation"
    aria-label="main navigation"
    @focusout="handleNavFocusOut"
  >
    <div class="navbar-brand" style="min-height: auto; height: 32px">
      <div class="navbar-item p-1">
        <app-logo class="is-24x24"></app-logo>
      </div>

      <div class="navbar-item p-1">
        <button
          class="button is-small is-white p-1"
          @click="handleBackClick"
          title="Back"
        >
          <span aria-hidden="true" class="material-symbols-outlined is-size-6"
            >arrow_back</span
          >
        </button>
      </div>

      <div class="navbar-item pl-0 pr-3">
        <bulma-spinner
          class="ml-1 mr-2"
          :style="{
            visibility:
              state.app.workingQueue.length > 0 ? 'visible' : 'hidden',
          }"
          color="var(--font-color)"
        ></bulma-spinner>

        <h1>
          <a
            href="#"
            title="Home"
            class="has-text-dark has-text-weight-bold"
            @click.prevent="navigate('/')"
          >
            <span>AP</span>
          </a>
        </h1>
      </div>

      <div class="navbar-item is-expanded is-hidden-desktop">
        <nav-bar-title :title="state.app.title"></nav-bar-title>
      </div>

      <a
        role="button"
        href="#"
        class="navbar-burger"
        style="height: 32px"
        :class="{ 'is-active': showMenu }"
        aria-label="Menu"
        @click.prevent="toggleMenu"
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>

    <div class="navbar-menu" :class="{ 'is-active': showMenu }">
      <div class="navbar-start" style="flex: 1">
        <div
          class="navbar-item has-dropdown"
          :class="{ 'is-hoverable': navBarActive }"
        >
          <a
            href="#"
            class="navbar-link pl-1"
            @mouseenter="navBarActive && $event.target.focus()"
            @click.prevent="handleNavMenuClick"
          >
            Projects
          </a>

          <div class="navbar-dropdown is-size-7">
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/projects')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >list</span
                >
              </span>
              <span class="ml-1"> All projects </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/projects',
                  query: { tab: 'mine' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >assignment_ind</span
                >
              </span>
              <span class="ml-1"> My projects </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/projects',
                  query: { tab: 'planning' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >edit_note</span
                >
              </span>
              <span class="ml-1"> Planning projects </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/projects',
                  query: { tab: 'development' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >code</span
                >
              </span>
              <span class="ml-1"> Development projects </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/projects',
                  query: { tab: 'testing' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >quiz</span
                >
              </span>
              <span class="ml-1"> Testing projects </span>
            </a>

            <hr class="navbar-divider soft-background" />
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="handleNewProject"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >add</span
                >
              </span>
              <span class="ml-1"> New project </span>
            </a>
          </div>
        </div>

        <div
          class="navbar-item has-dropdown"
          :class="{ 'is-hoverable': navBarActive }"
        >
          <a
            href="#"
            class="navbar-link pl-1"
            @mouseenter="navBarActive && $event.target.focus()"
            @click.prevent="handleNavMenuClick"
          >
            Items
          </a>

          <div class="navbar-dropdown is-size-7">
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/items')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6">
                  checklist
                </span>
              </span>
              <span class="ml-1"> All items </span>
            </a>

            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/items',
                  query: { tab: 'mine' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6">
                  assignment
                </span>
              </span>
              <span class="ml-1"> My items </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/items',
                  query: { tab: 'priority' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >priority_high</span
                >
              </span>
              <span class="ml-1"> High priority items </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/items',
                  query: { tab: 'pending' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >task_alt</span
                >
              </span>
              <span class="ml-1"> Pending items </span>
            </a>
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="
                navigate({
                  path: '/items',
                  query: { tab: 'testing' },
                })
              "
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >fact_check</span
                >
              </span>
              <span class="ml-1"> Testing items </span>
            </a>
            <hr class="navbar-divider soft-background" />
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/queue')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >format_list_numbered</span
                >
              </span>
              <span class="ml-1"> Queue </span>
            </a>
          </div>
        </div>

        <div
          class="navbar-item has-dropdown"
          :class="{ 'is-hoverable': navBarActive }"
        >
          <a
            href="#"
            class="navbar-link pl-1"
            @mouseenter="navBarActive && $event.target.focus()"
            @click.prevent="handleNavMenuClick"
          >
            Timelines
          </a>

          <div class="navbar-dropdown is-size-7">
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/timelines-chart')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >view_timeline</span
                >
              </span>
              <span class="ml-1"> Timelines chart </span>
            </a>

            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/timelines')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >view_list</span
                >
              </span>
              <span class="ml-1"> Timelines list </span>
            </a>

            <hr class="navbar-divider soft-background" />
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="handleNewTimeline"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >add</span
                >
              </span>
              <span class="ml-1"> New timeline </span>
            </a>
          </div>
        </div>

        <div
          class="navbar-item has-dropdown"
          :class="{ 'is-hoverable': navBarActive }"
        >
          <a
            href="#"
            class="navbar-link pl-1"
            @mouseenter="navBarActive && $event.target.focus()"
            @click.prevent="handleNavMenuClick"
          >
            More
          </a>

          <div class="navbar-dropdown is-size-7">
            <a
              href="#"
              class="navbar-item pt-1 pb-1"
              @click.prevent="navigate('/inactive-projects')"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                  >block</span
                >
              </span>
              <span class="ml-1"> Inactive projects </span>
            </a>
            <!-- <hr class="navbar-divider soft-background" />

            <a
              href=""
              target="_blank"
              rel="noopener noreferrer"
              class="navbar-item pt-1 pb-1"
              @click="navBarActive = false"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6">
                  analytics
                </span>
              </span>
              <span class="ml-1"> Reporting </span>
            </a>

            <hr class="navbar-divider soft-background" />

            <a
              href=""
              target="_blank"
              rel="noopener noreferrer"
              class="navbar-item pt-1 pb-1"
              @click="navBarActive = false"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6">
                  menu_book
                </span>
              </span>
              <span class="ml-1"> Documentation </span>
            </a>

            <a
              :href="state.app.config.datasourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="navbar-item pt-1 pb-1"
              @click="navBarActive = false"
            >
              <span class="icon">
                <span aria-hidden="true" class="material-symbols-outlined is-size-6">
                  storage
                </span>
              </span>
              <span class="ml-1"> Datasource </span>
            </a> -->
          </div>
        </div>

        <div class="navbar-item is-expanded is-hidden-touch">
          <nav-bar-title :title="state.app.title"></nav-bar-title>
        </div>
      </div>

      <div class="navbar-end">
        <div class="navbar-item pr-0">
          <full-text-search
            id="nav-full-text-search"
            search-placeholder="Search (ctrl + alt + /)"
            :input-style="{ height: '24px' }"
          ></full-text-search>
        </div>
        <div class="navbar-item">
          <div class="buttons p-0">
            <button
              class="button is-white is-small p-1"
              title="Refresh data"
              v-show="showRefreshAction"
              :class="{ 'is-loading': isLoading }"
              :disabled="isLoading"
              @click="refreshData"
            >
              <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                >refresh</span
              >
            </button>
            <button
              class="button is-white is-small p-1"
              title="Settings (ctrl + alt + s)"
              :class="{ 'is-loading': isLoading }"
              @click="navigate('/settings')"
            >
              <span aria-hidden="true" class="material-symbols-outlined is-size-6"
                >settings</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style>
.nav-border-ef002 {
  border-bottom: 1px solid gray;
}
</style>

<script>
const NavBar = {
  setup() {
    return {
      state: {
        app: store.state.app,
        data: store.state.data,
      },
      calculated: store.calculated,
      dispatch: {
        timeline: store.dispatch.timeline,
        project: store.dispatch.project,
        app: store.dispatch.app,
      },
    };
  },

  data() {
    return {
      showMenu: false,
      isLoading: false,
      navBarActive: false,
    };
  },

  computed: {
    showRefreshAction() {
      const currentRoute = this.state.app.currentRoute;

      return [
        "/",
        "/projects",
        "/inactive-projects",
        "/items",
        "/settings",
      ].includes(currentRoute);
    },
  },

  methods: {
    handleNavFocusOut(e) {
      if (!this.$refs.nav.contains(e.relatedTarget)) this.navBarActive = false;
    },
    handleNavMenuClick() {
      this.navBarActive = !this.navBarActive;
    },
    navigate(path) {
      this.navBarActive = false;
      this.$router.push(path);
    },
    toggleMenu() {
      this.showMenu = !this.showMenu;
    },
    async refreshData() {
      //prevent additional requests while one is in progess
      if (this.isLoading) return;

      this.isLoading = true;
      await this.dispatch.app.loadAppData();
      this.isLoading = false;
    },
    handleNewTimeline() {
      // const route = { path: "/timelines", query: { type: "new-timeline" } };
      const route = this.dispatch.timeline.getNewTimelineRoute();
      this.navigate(route);
    },
    handleNewProject() {
      const route = this.dispatch.project.getNewProjectRoute();
      this.navigate(route);
    },
    handleBackClick() {
      window.history.back();
    },
    handleFlashingAnimationEnd(e) {
      e.target.classList.remove("flashing");
    },
  },

  watch: {
    "state.app.polling.sessionPolls": {
      handler() {
        this.$refs.pollingIndicator.classList.add("flashing");
      },
    },
  },

  template: document.querySelector("#nav-bar-template").innerHTML,
};

app.component("nav-bar", NavBar);
</script>