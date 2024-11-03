<template id="apps-radio-template">
  <div class="field">
    <div class="control">
      <fieldset :disabled="disabled" :aria-label="ariaLabel">
        <legend
          class="label"
          :class="sizeClass"
        >
          <slot>{{ label }}</slot>
          <span
            class="has-text-danger"
            v-show="required"
          >*</span>
        </legend>
        <label
          class="radio"
          :class="sizeClass"
          :style="optionStyle"
          v-for="option in computedOptions"
          :key="option.value"
        >
          <input
            class="radio"
            type="radio"
            :name="id"
            :style="{ height: radioSize, width: radioSize }"
            :value="option.value"
            :checked="option.value === modelValue"
            :required="required"
            v-bind="client"
            @change="handleChange"
            @blur="handleBlur"
          />
          {{ option.text }}
        </label>
      </fieldset>
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
  //TODO: file size
  props: {
    label: String,
    ariaLabel: String,
    size: String,
    modelValue: [String, Number],
    options: Array,
    required: Boolean,
    disabled: Boolean,
    vertical: Boolean,
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
      computed,
    } = Vue;

    const hasSchema = computed(() => !!props.schema);

    //if a schema is provided, do internal validation with it....
    const internal = {
      validation: computed(() =>
        hasSchema.value ? props.schema.evaluate(props.modelValue) : null
      ),
      client: computed(() =>
        hasSchema.value ? { ...props.schema.client.get, type: 'radio' } : {}
      )
    };

    const errors = computed(() => 
      hasSchema.value ? internal.validation.value.errors : props.errors
    );

    const required = computed(() => 
      hasSchema.value ? internal.client.value.required : props.required
    );

    const id = ref(crypto.randomUUID());
    const visited = ref(false);

    const message = computed(() => errors.value.join(', '));

    const showError = computed(() =>
      (props.immediateValidation || visited.value)
      && errors.value.length > 0
    );

    const computedOptions = computed(() => {
      const opts = props.options || [];
      if (opts.length === 0) return opts;

      const isObject = typeof opts[0] === "object";

      return opts.map((opt) => ({
        value: isObject ? opt.value : opt,
        text: isObject ? opt.text : opt,
      }));
    });

    const optionStyle = computed(() =>
      props.vertical
        ? { display: "block", "margin-left": "0" }
        : ""
    );

    const sizeClass = computed(() => {
      const sizes = {
        'is-small': 'is-size-7',
        'is-medium': 'is-size-5',
        'is-large': 'is-size-4'
      };

      return sizes[props.size] || '';
    });

    const radioSize = computed(() => {
      const sizes = {
        'is-small': '.75rem',
        'is-medium': '1.25rem',
        'is-large': '1.5rem'
      };

      return sizes[props.size] || '';
    });

    const handleChange = (e) => {
      const newValue = e.target.value;

      ctx.emit("update:modelValue", newValue);
      ctx.emit("input", newValue);
      ctx.emit("change", newValue);

      visited.value = true;
    };

    const handleBlur = () => {
      ctx.emit("blur");
      visited.value = true;
    };

    return {
      id,
      message,
      showError,
      computedOptions,
      optionStyle,
      sizeClass,
      radioSize,
      client: internal.client,
      errors,
      required,
      handleChange,
      handleBlur
    };
  },

  template: document.querySelector("#apps-radio-template").innerHTML,
};

app.component("apps-radio", AppsRadio);
</script>