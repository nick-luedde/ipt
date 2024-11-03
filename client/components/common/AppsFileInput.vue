<template id="apps-file-input-template">
  <div
    class="field p-2 border-radius"
    :class="borderClass"
  >
    <div class="control">
      <div
        class="file"
        :class="[size]"
      >
        <label
          class="file-label"
          style="display: block; font-weight: 700"
        >
          <span
            v-if="label !== undefined || $slots.label"
            style="display: block"
          >
            <slot name="label">{{ label }}</slot>
            <span
              class="has-text-danger"
              v-show="required"
            >*</span>
          </span>
          <input
            class="file-input"
            type="file"
            :aria-label="ariaLabel"
            :accept="acceptString"
            :disabled="disabled || filesList.length >= maxlength"
            :value="value"
            v-bind="client"
            :required="requiredFlag"
            @change="handleFileSelect"
            @focus="handleFocus"
            @blur="handleBlur"
          />
          <span
            v-show="!disabled"
            class="file-cta"
            :class="{ 'is-hovered': isFocused }"
          >
            <span class="file-icon">
              <span
                class="material-symbols-outlined"
                aria-hidden="true"
              >file_upload</span>
            </span>
            <span class="file-label">
              {{ caption }}
            </span>
          </span>
        </label>
      </div>
      <p
        class="help has-text-danger"
        role="alert"
        v-show="showError"
      >
        {{ message }}
      </p>
      <p
        class="help has-text-danger"
        role="alert"
        v-show="internalMessage"
      >
        {{ internalMessage }}
      </p>
      <div class="pt-2 pb-2">
        <div
          v-for="(f, index) in filesList"
          :key="f.id"
          class="is-flex"
        >
          <span
            v-if="!f.url"
            :class="fontSize"
          >{{ f.name }} - {{ getFileSize(f.size) }}</span>
          <a
            v-if="!!f.url"
            :href="f.url"
            :class="fontSize"
            target="_blank"
            rel="noopener noreferrer"
          >{{ f.name }} - {{ getFileSize(f.size) }}</a>
          <div class="ml-1">
            <button
              v-show="!disabled && asyncLoadingQueue.length === 0"
              title="Remove file"
              type="button"
              class="delete"
              :class="size"
              @click="handleRemoveFile($event, index)"
            ></button>
          </div>
        </div>
      </div>
      <div
        v-show="showLoading"
        class="p-2 is-flex-polite is-justify-content-center"
      >
        <bulma-spinner></bulma-spinner>
      </div>
    </div>
    <p
      class="help is-flex-polite is-justify-content-end"
      v-show="fileCountHelp"
    >
      <span>{{ fileCountHelp }}</span>
    </p>
  </div>
</template>

<script>
export default {
  //TODO: individual client validation for Array<File> schemas...

  //TODO: Show button as disabled when disabled
  props: {
    modelValue: [Array, Object],
    label: String,
    ariaLabel: String,
    size: String,
    loading: Boolean,
    maxlength: {
      type: Number,
      default: 1
    },
    minlength: Number,
    caption: {
      type: String,
      default: "Select a file",
    },
    accept: {
      type: [Array, String],
      default: () => [],
    },
    maxsize: Number,
    disabled: {
      type: Boolean,
      default: false,
    },
    required: Boolean,
    errors: {
      type: Array,
      default: () => []
    },
    immediateValidation: Boolean,
    asyncselect: Function,
    asyncremove: Function,
    /** @type {import('vue').PropType<AsvAny>} */
    schema: Object
  },

  emits: [
    "change",
    "file-select",
    "file-remove",
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
    const maxsize = computed(() => 
      hasSchema.value ? internal.client.value.maxsize : props.maxsize
    );

    const visited = ref(false);

    const value = ref('');
    const isFocused = ref(false);
    const asyncLoadingQueue = ref([]);

    const internalMessage = ref('');

    const isMultiple = computed(() => Array.isArray(props.modelValue));
    const filesList = computed(() =>
      !props.modelValue ? []
        : isMultiple.value ? props.modelValue
          : [props.modelValue]
    );

    const message = computed(() => errors.value.join(', '));
    const showError = computed(() =>
      (props.immediateValidation || visited.value)
      && errors.value.length > 0
    );
    const fileCountHelp = computed(() => {
      if (!maxlength.value && !minlength.value)
        return '';

      // Very wierd, was getting a 'SYNTAX Error Unexpected token..' when usin Template literal for the final return...
      // no idea why, it was a copy past from the <apps-input> component that does the same thing and doesnt cause the same error....
        // really no clue what was going on, so just switch to string concat
      const len = filesList.value.length;
      const min = minlength.value || 0;
      const max = maxlength.value || 'any';
      const minPart = len < min ? ` [${min}]` : '';
      return String(len) + minPart + '/' + max;
    });

    const acceptString = computed(() => Array.isArray(props.accept) ? props.accept.join(',') : props.accept);

    const borderClass = computed(() =>
      isFocused.value ? 'focus-border'
        : showError.value ? 'error-border'
          : 'light-border'
    );

    const fontSize = computed(() => {
      const sizes = {
        'is-small': 'is-size-7',
        'is-medium': 'is-size-5',
        'is-large': 'is-size-4'
      };

      return sizes[props.size] || '';
    });

    const showLoading = computed(() => props.loading || asyncLoadingQueue.value.length > 0);

    const requiredFlag = computed(() =>
      //This is a hack to bypass the HTML5 form validation if there are values, but nothing in the actual input
      //in that case the input reads as invalid to HTML5 validation, but we technically have values within the model, so we can just switch off the required attribute to get it past validation there
      (filesList.value.length > 0)
        ? false
        : required.value
    );

    const getNewValue = (val) => isMultiple.value ? [...props.modelValue, val] : val;

    /* https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file */
    const getFileSize = (number) => {
      if (number < 1024) {
        return number + "bytes";
      } else if (number >= 1024 && number < 1048576) {
        return (number / 1024).toFixed(1) + "KB";
      } else if (number >= 1048576) {
        return (number / 1048576).toFixed(1) + "MB";
      }
    };

    const handleFocus = () => isFocused.value = true;
    const handleBlur = () => {
      isFocused.value = false;
      visited.value = true;
    };

    const validSize = (sz) => !maxsize.value || sz <= maxsize.value;
    const validCount = (ct) => !maxlength.value || ct <= maxlength.value;

    const handleFileSelect = (event) => {
      internalMessage.value = '';
      const files = event.target.files;

      if (files.length === 0) return;

      const [file] = files;

      const reader = new FileReader();

      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.replace(/data:(.*);base64,/, "");

        const blob = {
          data: base64,
          type: file.type,
          name: file.name,
          size: file.size,
        };

        if (!validSize(blob.size)) {
          internalMessage.value = `File must be less than ${getFileSize(maxsize.value)}`;
          value.value = "";
          return;
        }

        const newValue = getNewValue(blob);

        if (isMultiple.value && !validCount(newValue.length)) {
          internalMessage.value = `Only ${maxlength.value} files allowed`;
          value.value = "";
          return;
        }

        if (props.asyncselect && typeof props.asyncselect === "function") {
          asyncLoadingQueue.value.push(true);
          try {
            await props.asyncselect(blob);
            asyncLoadingQueue.value.pop();
          } catch (error) {
            asyncLoadingQueue.value.pop();
            throw error;
          }
        }

        ctx.emit("update:modelValue", newValue);
        ctx.emit("change", event);
        ctx.emit("file-select", blob);

        value.value = "";
      };

      reader.readAsDataURL(file);
    };

    const handleRemoveFile = async (event, index) => {
      const removed = filesList.value[index];

      const newValue = isMultiple.value
        ? [...props.modelValue].filter((b, i) => i !== index)
        : null;

      if (props.asyncremove && typeof props.asyncremove === "function") {
        asyncLoadingQueue.value.push(true);
        try {
          await props.asyncremove(removed);
          asyncLoadingQueue.value.pop();
        } catch (error) {
          asyncLoadingQueue.value.pop();
          throw error;
        }
      }

      ctx.emit("update:modelValue", newValue);
      ctx.emit("change", event);
      ctx.emit("file-remove", { blob: removed, index });
    };

    return {
      value,
      isFocused,
      asyncLoadingQueue,
      internalMessage,
      filesList,
      message,
      showError,
      fileCountHelp,
      borderClass,
      fontSize,
      showLoading,
      requiredFlag,
      acceptString,
      client: internal.client,
      errors,
      required,
      maxlength,
      getFileSize,
      handleFocus,
      handleBlur,
      handleFileSelect,
      handleRemoveFile
    };
  },

  template: document.querySelector("#apps-file-input-template").innerHTML,
};

app.component("apps-file-input", AppsFileInput);
</script>