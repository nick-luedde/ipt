<template id="apps-select-template">
  <div class="field">
    <label
      v-if="label !== undefined || $slots.label"
      class="label mb-1"
      :for="id"
      :class="size"
    >
      <slot name="label">{{ label }}</slot>
      <span
        class="has-text-danger"
        v-show="required"
      >*</span>
    </label>
    <div
      class="control"
      :class="{ 'has-icons-left': iconLeft }"
    >
      <slot name="desc"></slot>
      <div
        class="select"
        :class="size"
        :style="selectStyle"
      >
        <select
          :id="id"
          class="input"
          :class="{
            'is-danger': showError,
            [size]: size,
          }"
          :aria-label="ariaLabel"
          :value="modelValue"
          :disabled="disabled"
          :required="required"
          @change="handleChange"
          @blur="handleBlur"
        >
          <option
            v-if="placeholder"
            value=""
          >{{ placeholder }}</option>
          <option
            v-for="option in computedOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.text }}
          </option>
        </select>
        <span
          v-if="iconLeft"
          class="icon is-left"
          :class="size"
        >
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >{{ iconLeft }}</span>
        </span>
      </div>
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
    placeholder: String,
    size: String,
    modelValue: [String, Number],
    modelModifiers: {
      type: Object,
      default: () => ({}),
    },
    validation: String,
    required: Boolean,
    options: Array,
    disabled: Boolean,
    fullwidth: Boolean,
    errors: {
      type: Array,
      default: () => []
    },
    iconLeft: String,
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
        hasSchema.value ? props.schema.evaluate(getModifiedValue(props.modelValue)) : null
      ),
      client: computed(() =>
        hasSchema.value ? props.schema.client.get : {}
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

    const getModifiedValue = (val) => {
      if (props.modelModifiers.number) {
        const parsed = parseFloat(val);
        return !Number.isNaN(parsed) ? parsed : val;
      }

      return val;
    };

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

    const selectStyle = computed(() => props.fullwidth ? 'width: 100%' : '');

    const handleChange = (e) => {
      const newValue = getModifiedValue(e.target.value);
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
      visited,
      message,
      showError,
      computedOptions,
      selectStyle,
      client: internal.client,
      errors,
      required,
      handleChange,
      handleBlur
    };
  },

  template: document.querySelector("#apps-select-template").innerHTML,
};

app.component("apps-select", AppsSelect);
</script>