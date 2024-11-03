<template id="apps-suggest-template">
  <div
    ref="dropdown"
    class="dropdown"
    style="width: 100%"
    :class="{ 'is-active': dropdownActive }"
    @focusout="handleFocusOut"
  >
    <div
      ref="searchContainer"
      class="dropdown-trigger"
      style="width: 100%"
    >
      <apps-input
        :label="label"
        :aria-label="ariaLabel"
        :size="size"
        :placeholder="placeholder"
        :type="type"
        :model-value="modelValue"
        :pattern="pattern"
        :patternmessage="patternmessage"
        :max="max"
        :min="min"
        :maxlength="maxlength"
        :minlength="minlength"
        :readonly="readonly"
        :disabled="disabled"
        :required="required"
        :show-as-required="showAsRequired"
        :immediate-validation="immediateValidation"
        :errors="errors"
        :icon-left="iconLeft"
        :icon-right="iconRight"
        :schema="schema"
        @input="handleInput"
        @change="handleChange"
        @keydown="handleKeydown"
      >
        <template
          v-if="$slots.desc"
          #desc
        >
          <slot name="desc"></slot>
        </template>
        <template
          v-if="dropdownButton"
          #addon
        >
          <slot></slot>
          <button
            class="button"
            type="button"
            :class="size"
            :aria-label="searchForMatches ? 'Collapse dropdown menu' : 'Expand dropdown menu'"
            aria-haspopup="true"
            :disabled="disabled"
            @click="handleExpandClick"
          >
            <span
              class="icon"
              :class="size"
            >
              <span
                class="material-symbols-outlined"
                aria-hidden="true"
              >{{ searchForMatches ? 'expand_less' : 'expand_more' }}</span>
            </span>
          </button>
        </template>
      </apps-input>
    </div>
    <div
      class="dropdown-menu"
      role="menu"
      style="width: 100%; top: calc(100% - 16px);"
    >
      <div
        ref="menu"
        class="dropdown-content pt-0 pb-0"
        style="max-height: 50vh; overflow-y: auto;"
      >
        <span
          v-if="matches.length === 0"
          class="dropdown-item"
          :class="matchFontSize"
          style="white-space: pre-line; font-size: inherit;"
          role="row"
        >(No matches found)</span>
        <a
          v-for="(match, index) in matches"
          :key="`${index}-${match}`"
          href="#"
          class="dropdown-item"
          style="white-space: pre-line;"
          role="row"
          :class="{ 'has-background-light': currentItem === index, [matchFontSize]: true }"
          :aria-selected="currentItem === index"
          @click.prevent="handleSelect(match)"
        >
          <span
            v-for="(el, i) in splitMatchOnSearch(match)"
            :key="i"
            :class="{ 'theme-independent-white-font has-background-link': el.match }"
          >
            {{ el.val }}
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    ariaLabel: String,
    placeholder: String,
    size: String,
    dropdownButton: Boolean,
    modelValue: [String, Number],
    debounce: {
      type: Number,
      default: 500
    },
    type: {
      type: String,
      default: "text",
    },
    required: Boolean,
    max: Number,
    min: Number,
    minlength: Number,
    maxlength: Number,
    pattern: String,
    patternmessage: String,
    readonly: Boolean,
    disabled: Boolean,
    suggestions: Array,
    limit: Number,
    errors: {
      type: Array,
      default: () => []
    },
    iconLeft: String,
    iconRight: String,
    showAsRequired: Boolean,
    immediateValidation: Boolean,
    /** @type {import('vue').PropType<AsvAny>} */
    schema: Object,
  },

  emits: ['input', 'change', 'keypress', 'update:modelValue'],

  setup(props, ctx) {
    /** @type {VueOverrides} */
    const { ref, computed } = Vue;

    const update = (val) => ctx.emit('update:modelValue', val);

    const dropdown = ref(null);
    const searchContainer = ref(null);

    const focusSearch = () => {
      if (!searchContainer.value)
        return;

      const input = searchContainer.value.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      }
    };

    const search = ref('');

    const currentItem = ref(0);
    const menu = ref(null);

    const scrollToItem = () => {
      const menuEl = menu.value;
      if (!menuEl)
        return;

      const itm = menuEl.children[currentItem.value];
      if (itm && itm.scrollIntoView)
        itm.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };

    const splitMatchOnSearch = (match) => {
      // Find the matching term in the match string
      if (search.value === '')
        return [{ val: match }];

      const lowerSearch = search.value.toLowerCase();
      const lowerMatch = match.toLowerCase();

      const parts = lowerMatch.split(lowerSearch);

      const returnValue = [];
      let cursor = 0;
      parts.forEach((part, i) => {
        returnValue.push({ val: match.slice(cursor, cursor + part.length) });
        cursor += part.length;
        if (i < parts.length - 1) {
          returnValue.push({ val: match.slice(cursor, cursor + lowerSearch.length), match: true });
          cursor += lowerSearch.length;
        }
      });

      return returnValue;
    };

    const searchForMatches = ref(false);
    const matchFontSize = computed(() => {
      const sizes = {
        'is-small': 'is-size-7',
      };
      return sizes[props.size] || '';
    });

    const matches = computed(() => {
      if (!searchForMatches.value) return [];
      const lower = search.value.toLowerCase();

      const matched = props.suggestions
        .filter((sugg) => String(sugg).toLowerCase().includes(lower))
        .sort((a, b) => (a < b ? -1 : 1));

      if (props.limit)
        return matched.slice(0, props.limit);

      return matched;
    });

    const dropdownActive = computed(() => searchForMatches.value);

    const debouncedSearch = debounce(() => {
      searchForMatches.value = true;
      search.value = props.modelValue || '';
    }, props.debounce);

    const handleInput = (val) => {
      currentItem.value = 0;
      ctx.emit('input', val);
      update(val);
      debouncedSearch();
    };

    const handleKeydown = (e) => {
      switch (e.key) {
        case 'Down':
        case 'ArrowDown':
          e.preventDefault();
          if (currentItem.value + 1 >= matches.value.length) {
            currentItem.value = 0;
          } else {
            currentItem.value++;
          }
          scrollToItem();
          break;

        case 'Up':
        case 'ArrowUp':
          e.preventDefault();
          if (currentItem.value <= 0) {
            currentItem.value = matches.value.length - 1;
          } else {
            currentItem.value--;
          }
          scrollToItem();
          break;

        case 'Enter':
        case 'Tab':
          if (searchForMatches.value && matches.value[currentItem.value]) {
            e.preventDefault();
            handleSelect(matches.value[currentItem.value]);
          }
          searchForMatches.value = false;
          currentItem.value = 0;
          break;

        case 'Escape':
          if (searchForMatches.value) {
            searchForMatches.value = false;
          } else {
            update('');
          }
          break;
      }
    };

    const handleChange = (val) => {
      update(val);
      ctx.emit('change', val);
    };

    const handleFocusOut = (e) => {
      const container = dropdown.value;
      if (!!container && !container.contains(e.relatedTarget))
        searchForMatches.value = false;
    };

    const handleSelect = (match) => {
      update(match);
      ctx.emit('change', match);

      searchForMatches.value = false;
    };

    const handleExpandClick = () => {
      search.value = props.modelValue || '';
      searchForMatches.value = !searchForMatches.value;
      focusSearch();
    };

    return {
      dropdown,
      searchContainer,
      search,
      currentItem,
      menu,
      splitMatchOnSearch,
      searchForMatches,
      matchFontSize,
      matches,
      dropdownActive,
      debouncedSearch,
      handleInput,
      handleKeydown,
      handleFocusOut,
      handleChange,
      handleSelect,
      handleExpandClick
    };
  },

  template: document.querySelector("#apps-suggest-template").innerHTML,
};

app.component("apps-suggest", AppsSuggest);
</script>