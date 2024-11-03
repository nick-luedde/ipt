/**
 * @template T
 * 
 * @param {object} options
 * @param {AsvSchemaContext<T>} options.schema
 * @param {T} options.reactiveObj
 */
const useSchemaValidation = ({ schema, reactiveObj }) => {
  /** @type {VueOverrides} */
  const {
    unref,
    computed,
  } = Vue;

  const Model = schema;

  const validation = computed(() => {
    console.time('validation'); //DEBUG
    const sch = Model.validate(unref(reactiveObj), { throwError: false });
    console.timeEnd('validation');
    return sch;
  });

  const item = computed(() => validation.value.item);
  const items = computed(() => validation.value.items);
  const isValid = computed(() => !validation.value.hasError);

  const errors = computed(() => Model.errors(reactiveObj));

  const test = () => Model.test(unref(reactiveObj));

  //TODO: more helpers here...
  //TODO: options for individual validation that isnt reactive to the entire obj?

  return {
    schema: Model.schema,
    item,
    items,
    isValid,
    errors,
    test
  };
};