/**
 * Initializer for app keyboard shortcuts
 * @param {Vue} vueApp - vue root app model
 */
const IspKeyboardShortcuts = (vueApp) => {

  const actions = {
    // GOTO navbar search
    'ctrl+alt+/': (event) => {
      event.preventDefault();

      const searchContainer = document.querySelector('#nav-full-text-search');
      if (!searchContainer)
        return;

      const search = searchContainer.querySelector('input');
      if (search) {
        search.focus();
        search.select();
      }
    },

    // GOTO dashboard
    'ctrl+alt+h': (event) => {
      event.preventDefault();

      vueApp.$router.push('/');
    },

    // GOTO my projects
    'ctrl+alt+p': (event) => {
      event.preventDefault();

      vueApp.$router.push({
        path: '/projects',
        query: { tab: 'mine' },
      });
    },

    // GOTO queue
    'ctrl+alt+q': (event) => {
      event.preventDefault();

      vueApp.$router.push('/queue');
    },

    // GOTO my items
    'ctrl+alt+i': (event) => {
      event.preventDefault();

      vueApp.$router.push({
        path: '/items',
        query: { tab: 'mine' },
      });
    },

    // GOTO timelines
    'ctrl+alt+c': (event) => {
      event.preventDefault();

      vueApp.$router.push('/timelines-chart');
    },

    // GOTO settings
    'ctrl+alt+s': (event) => {
      event.preventDefault();

      vueApp.$router.push('/settings');
    },

  };

  const handler = (event) => {
    let key = '';

    if (event.ctrlKey)
      key += 'ctrl+';
    if (event.altKey)
      key += 'alt+';
    if (event.shiftKey)
      key += 'shift+';

    key += event.key.toLowerCase();

    const action = actions[key];
    if (action)
      action.call(null, event);
  };

  const connect = () => document.addEventListener('keydown', handler);
  const disconnect = () => document.removeEventListener('keydown', handler);

  return {
    connect,
    disconnect
  };

};