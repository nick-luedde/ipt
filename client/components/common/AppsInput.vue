<template id="apps-input-template">
  <div>
    <label
      v-if="label !== undefined || $slots.label"
      class="label mb-1"
      :for="id"
      :class="size"
    >
      <slot name="label">{{ label }}</slot>
      <span
        class="has-text-danger"
        v-show="required || showAsRequired"
      >*</span>
    </label>
    <div
      class="field"
      :class="{ 'has-addons': $slots.addon, 'mb-0': showError || maxlength || minlength }"
    >
      <div
        class="control is-expanded"
        :class="{ 'mr-0': showError, 'has-icons-left': iconLeft, 'has-icons-right': iconRight }"
      >
        <slot name="desc"></slot>
        <input
          v-if="type !== 'textarea'"
          :id="id"
          class="input"
          :class="{
            'is-danger': showError,
            [size]: size,
          }"
          :aria-label="ariaLabel"
          :placeholder="placeholder"
          :type="type"
          :value="showValue"
          :pattern="pattern"
          :max="max"
          :min="min"
          :maxlength="maxlength"
          :minlength="minlength"
          :readonly="readonly"
          :disabled="disabled"
          :step="step"
          :required="required"
          v-bind="client"
          @input="handleInput"
          @change="handleChange"
          @blur="handleBlur"
          @keydown="$emit('keydown', $event)"
          @keypress="$emit('keypress', $event)"
          @keyup="$emit('keyup', $event)"
        />
        <textarea
          v-if="type === 'textarea'"
          class="textarea"
          :id="id"
          :class="{
            'is-danger': showError,
            [size]: size,
          }"
          :aria-label="ariaLabel"
          :placeholder="placeholder"
          :value="modelValue"
          :maxlength="maxlength"
          :minlength="minlength"
          :readonly="readonly"
          :disabled="disabled"
          :required="required"
          v-bind="client"
          @input="handleInput"
          @change="handleChange"
          @blur="handleBlur"
          @keydown="$emit('keydown', $event)"
          @keypress="$emit('keypress', $event)"
          @keyup="$emit('keyup', $event)"
        ></textarea>
        <span
          v-if="iconLeft"
          class="icon is-left"
          :class="size"
          style="top: auto; bottom: 0;"
        >
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >{{ iconLeft }}</span>
        </span>
        <span
          v-if="iconRight"
          class="icon is-right"
          :class="size"
          style="top: auto; bottom: 0;"
        >
          <span
            aria-hidden="true"
            class="material-symbols-outlined"
          >{{ iconRight }}</span>
        </span>
      </div>
      <div
        v-if="$slots.addon"
        class="control is-flex"
      >
        <slot name="addon"></slot>
      </div>
    </div>
    <div class="help is-flex-polite is-justify-content-end">
      <p
        class="has-text-danger"
        role="alert"
        style="flex: 1;"
        v-show="showError"
      >
        {{ message }}
      </p>
      <p
        v-show="lengthHelp"
        role="alert"
      >
        {{ lengthHelp }}
      </p>
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
    modelValue: [String, Number],
    modelModifiers: {
      type: Object,
      default: () => ({}),
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
    showAsRequired: Boolean,
    immediateValidation: Boolean,
    /** @type {import('vue').PropType<AsvAny>} */
    schema: Object
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
      computed,
      watch
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

    const minlength = computed(() => 
      hasSchema.value ? internal.client.value.minlength : props.minlength
    );
    const maxlength = computed(() => 
      hasSchema.value ? internal.client.value.maxlength : props.maxlength
    );

    const type = computed(() => 
      hasSchema.value ? internal.client.value.type : props.type
    );

    const id = ref(crypto.randomUUID());
    const visited = ref(false);

    const getModifiedValue = (val) => {
      if (props.modelModifiers.number || type.value === "number") {
        const parsed = parseFloat(val);
        return !Number.isNaN(parsed) ? parsed : val;
      }

      return val;
    };

    const message = computed(() => errors.value.join(', '));
    const showValue = ref(getModifiedValue(props.modelValue));

    const showError = computed(() =>
      (props.immediateValidation || visited.value)
      && errors.value.length > 0
    );

    const lengthHelp = computed(() => {
      if (!maxlength.value && !minlength.value)
        return null;

      const len = (props.modelValue || '').length;
      const min = minlength.value || 0;
      const max = maxlength.value || 'any';

      return `${len}${len < min ? ` [${min}]` : ''}/${max}`;
    });

    const handleInput = (e) => {
      const newValue = getModifiedValue(e.target.value);
      showValue.value = newValue;

      if (!props.modelModifiers.lazy) ctx.emit("update:modelValue", newValue);

      ctx.emit("input", newValue);
    };

    const handleChange = (e) => {
      const newValue = getModifiedValue(e.target.value);

      if (props.modelModifiers.lazy) ctx.emit("update:modelValue", newValue);
      ctx.emit("change", newValue);

      visited.value = true;
    };

    const handleBlur = () => {
      ctx.emit("blur");
      visited.value = true;
    };

    watch(
      () => props.modelValue,
      () => showValue.value = props.modelValue
    );

    return {
      id,
      showError,
      message,
      showValue,
      lengthHelp,
      client: internal.client,
      errors,
      required,
      type,
      handleInput,
      handleChange,
      handleBlur
    };
  },

  template: document.querySelector("#apps-input-template").innerHTML,
};

app.component("apps-input", AppsInput);
</script>