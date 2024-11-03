<template id="apps-tags-template">
  <component
    :is="component"
    :label="label"
    :aria-label="ariaLabel"
    :size="size"
    :fullwidth="fullwidth"
    :model-modifiers="modelModifiers"
    :placeholder="placeholder"
    :type="type"
    :pattern="pattern"
    :patternmessage="patternmessage"
    :max="max"
    :min="min"
    :maxlength="maxlength"
    :minlength="minlength"
    :readonly="readonly"
    :disabled="disabled"
    :immediate-validation="immediateValidation"
    :lookups="lookups"
    :suggestions="suggestions"
    :limit="limit"
    :options="options"
    :errors="errors"
    :icon-left="iconLeft"
    :icon-right="iconRight"
    :show-as-required="required"
    :required="requiredFlag"
    v-model="newTag"
    @input="handleInput"
    @change="handleChange"
    @blur="handleBlur"
    @keydown="handleNewItemKeydown"
  >
    <template #desc>
      <article
        v-show="modelValue.length > 0"
        aria-live="polite"
        class="tags mb-0"
        :style="tagListStyle"
      >
        <span
          v-for="(val, i) in modelValue"
          :key="val"
          class="tag m-1"
          :class="[size, tagColor]"
        >
          {{ display(val) }}
          <button
            v-show="!disabled"
            type="button"
            class="delete"
            :class="size"
            title="Remove tag"
            :disabled="disabled"
            @click="handleRemoveTag(i)"
          ></button>
        </span>
      </article>
    </template>
  </component>
</template>

<script>
export default {
  props: {
    label: String,
    ariaLabel: String,
    placeholder: String,
    size: String,
    fullwidth: Boolean,
    tagColor: String,
    modelValue: Array,
    modelModifiers: {
      type: Object,
      default: () => ({}),
    },
    type: {
      type: String,
      default: "text",
    },
    options: Array,
    suggestions: Array,
    lookups: Array,
    limit: Number,
    required: Boolean,
    max: Number,
    min: Number,
    minlength: Number,
    maxlength: Number,
    pattern: String,
    patternmessage: String,
    readonly: Boolean,
    disabled: Boolean,
    step: {
      type: [String, Number],
      default: "any",
    },
    errors: {
      type: Array,
      default: () => []
    },
    iconLeft: String,
    iconRight: String,
    immediateValidation: Boolean,
    displayFn: Function,
    /** @type {import('vue').PropType<AsvArray>} */
    schema: Object,
  },

  emits: [
    "input",
    "change",
    "blur",
    "keyup",
    "keydown",
    "keypress",
    "update:modelValue",
  ],

  setup(props, ctx) {
    /** @type {VueOverrides} */
    const {
      ref,
      computed
    } = Vue;

    const hasSchema = computed(() => !!props.schema);

    //if a schema is provided, do internal validation with it....
    const internal = {
      validation: computed(() =>
        hasSchema.value ? props.schema.evaluate(props.modelValue) : null
      ),
      client: computed(() =>
        hasSchema.value ? props.schema.client.get : {}
      )
    };

    const errors = computed(() => {
      if (!hasSchema.value)
        return props.errors;

      const primary = internal.validation.value.errors;
      const suberrors = internal.validation.value.items || [];

      return [...primary, ...suberrors.map((vl) => vl.errors).flat()];
    });

    const required = computed(() =>
      hasSchema.value ? internal.client.value.required : props.required
    );

    const type = computed(() =>
      hasSchema.value ? internal.client.value.type : props.type
    );

    const visited = ref(false);

    const newTag = ref('');

    const showError = computed(() =>
      (props.immediateValidation || visited.value)
      && errors.value.length > 0
    );

    const inputStyle = computed(() => {
      const hasTags = props.modelValue && props.modelValue.length > 0;
      if (!hasTags)
        return "";

      const style = {
        "border-top": "none",
        "border-top-left-radius": 0,
        "border-top-right-radius": 0
      };

      return style;
    });

    const component = computed(() =>
      props.lookups ? 'apps-lookup'
        : props.suggestions ? 'apps-suggest'
          : props.options ? 'apps-select'
            : 'apps-input'
    );

    const tagListStyle = computed(() => {
      const borderRadius =
        props.size && props.size.includes("is-small") ? "2px" : "4px";

      const color = showError.value ? 'var(--danger-color)' : 'var(--highlight-color)';
      return {
        border: `1px solid ${color}`,
        "border-bottom": "none",
        "border-top-left-radius": borderRadius,
        "border-top-right-radius": borderRadius,
        "border-bottom-left-radius": 0,
        "border-bottom-right-radius": 0,
      };
    });
    const requiredFlag = computed(() =>
      //This is a hack to bypass the HTML5 form validation if there are values, but nothing in the actual input
      //in that case the input reads as invalid to HTML5 validation, but we technically have values within the model, so we can just switch off the required attribute to get it past validation there
      (errors.value.length === 0)
        ? false
        : required.value
    );

    const handleInput = (e) => {
      ctx.emit("input", e);
    };

    const handleNewItemKeydown = (e) => {
      ctx.emit("keydown", e);
      if (e.key === "Enter") {
        e.preventDefault();
        handleNewItem(e.target.value);
      }
    };

    let toggle = newTag.value; //Hack to force watchers to see new val
    const handleNewItem = (tagValue) => {
      //TODO: validate item... then add if valid??

      if (!!tagValue || tagValue === 0) {
        const newValue = getModifiedValue(tagValue);
        ctx.emit("update:modelValue", newValue);
        ctx.emit("change", newValue);
      }

      toggle = toggle === null ? '' : null;

      newTag.value = toggle;
      visited.value = true;
    };

    const handleChange = (e) => {
      const val = e && e.target ? e.target.value : e;
      handleNewItem(val);
    };

    const handleBlur = () => {
      ctx.emit("blur");
      visited.value = true;
    };

    const handleRemoveTag = (index) => {
      const newValue = props.modelValue.filter((itm, i) => i !== index);
      ctx.emit("change", newValue);
      ctx.emit("update:modelValue", newValue);
      visited.value = true;
    };

    const getModifiedValue = (val) => {
      let newTag = val;
      if (props.modelModifiers.number || type.value === "number") {
        const parsed = parseFloat(val);
        newTag = !Number.isNaN(parsed) ? parsed : val;
      }

      const set = new Set([...props.modelValue, newTag]);
      const newValue = [...set];

      return newValue;
    };

    const display = (val) => {
      if (typeof props.displayFn === 'function') {
        return props.displayFn(val);
      } else {
        return val;
      }
    }

    return {
      visited,
      newTag,
      inputStyle,
      component,
      tagListStyle,
      requiredFlag,
      client: internal.client,
      errors,
      required,
      type,
      handleInput,
      handleNewItemKeydown,
      handleNewItem,
      handleChange,
      handleBlur,
      handleRemoveTag,
      display,
    };
  },

  template: document.querySelector("#apps-tags-template").innerHTML,
};

app.component("apps-tags", AppsTags);
</script>