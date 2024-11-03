<template id="apps-checkbox-template">
  <div class="field">
    <div class="control">
      <label
        class="checkbox label has-text-weight-normal"
        :class="sizeClass"
      >
        <input
          class="checkbox mr-1"
          type="checkbox"
          :style="{ height: checkboxSize, width: checkboxSize }"
          :aria-label="ariaLabel"
          :value="modelValue"
          :checked="modelValue"
          :disabled="disabled"
          :required="required"
          v-bind="client"
          @change="handleChange"
          @blur="handleBlur"
        />
        <slot name="label">{{ label }}</slot>
        <span
          class="has-text-danger"
          v-show="required"
        >*</span>
      </label>
    </div>
    <p
      class="help has-text-danger"
      role="alert"
      v-show="showError"
    >
      {{ message }}
    </p>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    ariaLabel: String,
    size: String,
    modelValue: Boolean,
    required: Boolean,
    disabled: Boolean,
    errors: {
      type: Array,
      default: () => []
    },
    immediateValidation: Boolean,
    /** @type {import('vue').PropType<AsvAny>} */
    schema: Object,
  },

  emits: ["input", "change", "blur", "update:modelValue"],

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
        hasSchema.value ? { ...props.schema.client.get, type: 'checkbox' } : {}
      )
    };

    const errors = computed(() => 
      hasSchema.value ? internal.validation.value.errors : props.errors
    );

    const required = computed(() => 
      hasSchema.value ? internal.client.value.required : props.required
    );

    const visited = ref(false);
    const message = computed(() => errors.value.join(', '));
    const showError = computed(() =>
      (props.immediateValidation || visited.value)
      && errors.value.length > 0
    );

    const sizeClass = computed(() => {
      const sizes = {
        'is-small': 'is-size-7',
        'is-medium': 'is-size-5',
        'is-large': 'is-size-4'
      };

      return sizes[props.size] || '';
    });

    const checkboxSize = computed(() => {
      const sizes = {
        'is-small': '.75rem',
        'is-medium': '1.25rem',
        'is-large': '1.5rem'
      };

      return sizes[props.size] || '';
    });

    const handleChange = (e) => {
      ctx.emit("update:modelValue", e.target.checked);
      ctx.emit("input", e.target.checked);
      ctx.emit("change", e.target.checked);

      visited.value = true;
    };

    const handleBlur = () => {
      ctx.emit("blur");
      visited.value = true;
    };

    return {
      message,
      showError,
      sizeClass,
      checkboxSize,
      client: internal.client,
      errors,
      required,
      handleChange,
      handleBlur
    };
  },

  template: document.querySelector("#apps-checkbox-template").innerHTML,
};

app.component("apps-checkbox", AppsCheckbox);
</script>