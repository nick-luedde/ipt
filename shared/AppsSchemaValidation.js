class AppsSchemaValidation {

  /**
   * Not sure if this is helpfull, but could be mildly for performance when do a lot of real-time validation
   * Saves a little time and space to have a cached 'singleton' type instances, but could be a bad pattern, dunno really...
   */
  static instance() {
    if (!AppsSchemaValidation.__instance__)
      AppsSchemaValidation.__instance__ = AppsSchemaValidation.asv();

    /** @type {Asv>} */
    const instance = AppsSchemaValidation.__instance__;
    return instance;
  }

  static asv() {
    //TODO: what kinda options do we even have here?
    // dunno...

    //TODO: factor out some share functionality so we dont need quite as much duplication!
    //TODO: static array definitiions ['string', 'number'] would be valid for ['abc', 123] but not [123, 'abc']
    //TODO: enum and enumlist type supprt

    //TODO: parser for errors... maybe an array of errors with prop names, could be useful here and there

    const sym = Symbol('validation');

    const isRawSimpleSchema = (obj) => !isNullish(obj) && typeof obj.type === 'string';
    const isSchema = (obj) => !isNullish(obj) && !!obj[sym];
    const isSchemaType = (obj) => isSchema(obj) || Object.values(obj).every(isSchema);

    const isNullish = (v) => v === null || v === undefined || v === '';
    const isMissing = (v) => isNullish(v) || Number.isNaN(v) || (Array.isArray(v) && v.length === 0);
    const verifyWithMessage = (valid, /** @type {string} */ msg) => !valid && msg;

    const helpers = {
      functionInGlobal: (prop, fnName) => (prop in globalThis && !isNullish(globalThis[prop]) && typeof globalThis[prop][fnName] === 'function'),
      pseudoRandomId: () => {
        //TODO: improve this
        const chars = ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'];
        const LEN = 10;
        let id = '';
        for (let i = 0; i < LEN; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          id += char;
        }
        return id;
      },
      generateId: () => helpers.functionInGlobal('Utilities', 'getUuid')
        ? Utilities.getUuid()
        : helpers.functionInGlobal('crypto', 'randomUUID')
          ? crypto.randomUUID()
          : helpers.pseudoRandomId(),
      getAuditUser: () => helpers.functionInGlobal('Session', 'getActiveUser')
        ? Session.getActiveUser().getEmail()
        : null
    };

    //TODO: val or length check....
    const checks = {
      required: (val) => verifyWithMessage(!isMissing(val), 'Is required'),
      max: (/** @type {number} */ mx) => (val) => !isNullish(val) && verifyWithMessage(val <= mx, `Must be less than ${mx}`),
      min: (/** @type {number} */ mn) => (val) => !isNullish(val) && verifyWithMessage(val >= mn, `Must be greater than ${mn}`),
      maxlength: (/** @type {number} */ mx) => (val) => !isNullish(val) && verifyWithMessage(val.length <= mx, `Must be less than ${mx} in length`),
      minlength: (/** @type {number} */ mn) => (val) => !isNullish(val) && verifyWithMessage(val.length >= mn, `Must be greater than ${mn} in length`),
      any: {
        is: () => false,
        toStorage: (val) => String(val),
        fromStorage: (val) => val,
      },
      number: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'number', 'Is not a number'),
        toStorage: (val) => isNullish(val) ? null : Number(val),
        fromStorage: (val) => isNullish(val) ? null : Number(val),
      },
      string: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      id: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string id'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      audit: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string', 'Is not a string audit'),
        toStorage: (val) => isNullish(val) ? null : String(val),
        fromStorage: (val) => isNullish(val) ? null : String(val),
      },
      url: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && val.startsWith('https://'), "Is not an 'https://' url"),
        sanitize: (/** @type {string} */ val) => isNullish(val) ? null
          : /^(https:\/\/)/i.test(val) ? val : null,
        toStorage: (val) => isNullish(val) ? null : checks.url.sanitize(val),
        fromStorage: (val) => isNullish(val) ? null : checks.url.sanitize(val),
      },
      boolean: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'boolean', 'Is not a boolean'),
        toStorage: (val) => isNullish(val) ? null : Boolean(val),
        fromStorage: (val) => isNullish(val) ? null : Boolean(val),
      },
      date: {
        is: (val) => !isNullish(val) && verifyWithMessage(val instanceof Date, 'Is not a date'),
        toStorage: (val) => isNullish(val) ? null : new Date(val),
        fromStorage: (val) => isNullish(val) ? null : new Date(val),
      },
      datestring: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}/.test(val), 'Is not a date-string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('T')[0];
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('T')[0];
          return null;
        },
      },
      datetimestring: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}(:[\d]{0,2})?/.test(val), 'Is not a datetime string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON().split('.')[0];
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}T${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}:00`;
          return null;
        },
      },
      jsondate: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'string' && /[\d]+-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}[A-Z]/.test(val), 'Is not a json date string'),
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
      },
      timestamp: {
        is: (val) => checks.jsondate.is(val),
        toStorage: (val) => {
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'string' && val !== '') return val;
          if (val instanceof Date) return val.toJSON();
          if (typeof val === 'object' && !isNullish(val.seconds)) {
            const tts = new Date(0);
            tts.setUTCSeconds(val.seconds);
            return tts.toJSON();
          }
          return null;
        },
      },
      array: {
        is: (val) => !isNullish(val) && verifyWithMessage(Array.isArray(val), 'Is not an array'),
        toStorageRaw: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return val;
          return null;
        },
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return JSON.stringify(val);
          if (typeof val === 'string' && val !== '') return val;
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : null;
          };
          return null;
        },
      },
      object: {
        is: (val) => !isNullish(val) && verifyWithMessage(typeof val === 'object', 'Is not an object'),
        toStorageRaw: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return val;
          return null;
        },
        toStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'string' && val !== '') return val;
          return null;
        },
        fromStorage: (val) => {
          if (isNullish(val)) return null;
          if (typeof val === 'object') return val;
          if (typeof val === 'string') return JSON.parse(val);
          return null;
        },
      },
      file: {
        is: (val) => checks.object.is(val),
        toStorage: (val) => checks.object.toStorage(val),
        fromStorage: (val) => checks.object.fromStorage(val),
        types: (types) => (val) => !isNullish(val) && verifyWithMessage(types.some(val.type), 'Is not an accepted file type'),
        size: (mx) => (val) => !isNullish(val) && verifyWithMessage(val.size <= mx, 'Is too large'),
      }
    };

    /**
     * Base object for scheme definition
     * @param {AsvSchemeType} type 
     */
    const base = (type) => {
      /** @type {BaseAsvTypeContext} */
      const ctx = {
        type,
        rules: [],
        client: {},
        defaultFn: undefined,
        updateFn: undefined,
        sub: {
          schema: undefined,
          isSimple: false
        },
        valid: {
          isValid: (val, mdl) => !ctx.valid.check || verifyWithMessage(ctx.valid.check(val, mdl), ctx.valid.msg),
          check: undefined,
          msg: ''
        },
      };

      const hasLength = ctx.type === 'array'
        || ctx.type === 'string';

      /** @type {BaseAsvType} */
      const api = {
        [sym]: true,
        type: ctx.type,
        required: () => {
          ctx.rules.push(checks.required);
          ctx.client.required = true;
          return api;
        },
        max: (mx) => {
          if (hasLength) {
            ctx.rules.push(checks.maxlength(mx));
            ctx.client.maxlength = mx;
          } else {
            ctx.rules.push(checks.max(mx));
            ctx.client.max = mx;
          }
          return api;
        },
        min: (mn) => {
          if (hasLength) {
            ctx.rules.push(checks.minlength(mn));
            ctx.client.minlength = mn;
          } else {
            ctx.rules.push(checks.min(mn));
            ctx.client.min = mn;
          }
          return api;
        },
        default: (fn) => {
          ctx.defaultFn = fn;
          return api;
        },
        update: (fn) => {
          ctx.updateFn = fn;
          return api;
        },
        valid: (fn, msg) => {
          // fn = (val, model) => {}
          ctx.valid.check = fn;
          ctx.valid.msg = msg || 'Is not valid';
          ctx.rules.push(ctx.valid.isValid);
          return api;
        },
        resolver: (fn) => {
          ctx.resolver = fn;
          return api;
        },
        schema: (obj) => {
          ctx.sub.isSimple = isSchema(obj) || isRawSimpleSchema(obj);
          ctx.sub.schema = isSchema(obj) ? { v: obj }
            : isSchemaType(obj) ? obj
              : ctx.sub.isSimple ? fromRaw({ v: obj }) : fromRaw(obj);
          return api;
        },
        client: {
          get: ctx.client,
          set: (/** @type {{ [key: string]: string }} */ vals) => {
            Object.entries(vals).forEach(([key, val]) => ctx.client[key] = val);
            return api;
          }
        },

        evaluate: (val, model) => {
          const results = {
            errors: ctx.rules.map(rule => rule(val, model)).filter(r => !!r),
            hasError: false,
          };
          let hasError = results.errors.length > 0;

          if (ctx.sub.schema && !isNullish(val)) {

            if (ctx.type === 'array' && Array.isArray(val)) {
              const subvalidation = val.map(entry => {
                const res = validateComplete(ctx.sub.schema, ctx.sub.isSimple ? { v: entry } : entry, model);

                hasError = hasError || res.hasError;
                return ctx.sub.isSimple ? res.item.v : res;
              });
              results.items = subvalidation;

            } else {

              const subvalidation = validateComplete(ctx.sub.schema, val, model);
              results.errors = [...results.errors, ...subvalidation.errors];
              results.item = subvalidation.item;
              hasError = hasError || subvalidation.hasError;

            }
          }

          results.hasError = hasError;
          return results;
        },
        apply: (val, model, { isNew } = {}) => {
          if (isNew && isNullish(val) && ctx.defaultFn) val = ctx.defaultFn();
          if (ctx.updateFn) val = ctx.updateFn(model);
          if (ctx.resolver) val = ctx.resolver(val);
          if (ctx.sub.schema && !isNullish(val))

            if (ctx.type === 'array' && Array.isArray(val)) {

              val = val.map(entry => {
                const res = applyComplete(ctx.sub.schema, ctx.sub.isSimple ? { v: entry } : entry, model, { isNew, noStringify: true })
                return ctx.sub.isSimple ? res.v : res;
              });

            } else {

              val = applyComplete(ctx.sub.schema, val, model, { isNew })

            }

          return val;
        },
        exec: (val, model, { isNew, noStringify } = {}) => {
          const applied = api.apply(val, model, { isNew });
          const validation = api.evaluate(applied, model);
          const storage = noStringify ? checks[ctx.type].toStorageRaw(applied) : checks[ctx.type].toStorage(applied);
          return { validation, storage };
        },

        parse: (val) => checks[ctx.type].fromStorage(val),
      };

      return { ctx, api };
    };

    const types = {

      /** @returns {AsvAny} */
      any: () => {
        const { api } = base('any');

        return api;
      },

      /** @returns {AsvNumber} */
      number: () => {
        const { ctx, api } = base('number');

        ctx.rules.push(checks.number.is);
        api.client.set({ type: 'number' });

        return api;
      },

      /** @returns {AsvString} */
      string: () => {
        const { ctx, api } = base('string');

        ctx.rules.push(checks.string.is);
        api.client.set({ type: 'text' });

        return api;
      },

      /** @returns {AsvId} */
      id: () => {
        const { ctx, api } = base('id');

        ctx.rules.push(checks.id.is);
        api.client.set({ type: 'text' });

        ctx.defaultFn = helpers.generateId;

        return api;
      },

      /** @returns {AsvUrl} */
      url: () => {
        const { ctx, api } = base('url');

        ctx.rules.push(checks.url.is);
        api.client.set({ type: 'text' });

        return api;
      },

      /** @returns {AsvBoolean} */
      boolean: () => {
        const { ctx, api } = base('boolean');

        ctx.rules.push(checks.boolean.is);

        return api;
      },

      /** @returns {AsvDate} */
      date: () => {
        const { ctx, api } = base('date');

        ctx.rules.push(checks.date.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvDateString} */
      datestring: () => {
        const { ctx, api } = base('datestring');

        ctx.rules.push(checks.datestring.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvDateTimeString} */
      datetimestring: () => {
        const { ctx, api } = base('datetimestring');

        ctx.rules.push(checks.datetimestring.is);
        api.client.set({ type: 'datetime-local' });

        return api;
      },

      /** @returns {AsvJsonDate} */
      jsondate: () => {
        const { ctx, api } = base('jsondate');

        ctx.rules.push(checks.jsondate.is);
        api.client.set({ type: 'date' });

        return api;
      },

      /** @returns {AsvTimestamp} */
      timestamp: () => {
        const { ctx, api } = base('timestamp');

        ctx.rules.push(checks.timestamp.is);
        api.client.set({ type: 'datetime-local' });

        api.default = () => {
          ctx.defaultFn = () => new Date().toJSON();
          return api;
        };

        api.update = () => {
          ctx.updateFn = () => new Date().toJSON();
          return api;
        };

        return api;
      },

      /** @returns {AsvAudit} */
      audit: () => {
        const { ctx, api } = base('audit');

        ctx.rules.push(checks.audit.is);
        api.client.set({ type: 'text' });

        const getter = helpers.getAuditUser;

        api.default = () => {
          ctx.defaultFn = getter;
          return api;
        };

        api.update = () => {
          ctx.updateFn = getter;
          return api;
        };

        return api;
      },

      /** @returns {AsvArray} */
      array: () => {
        const { ctx, api } = base('array');

        ctx.rules.push(checks.array.is);

        return api;
      },

      /** @returns {AsvObject} */
      object: () => {
        const { ctx, api } = base('object');

        ctx.rules.push(checks.object.is);

        return api;
      },

      /** @returns {AsvFile} */
      file: () => {
        const { ctx, api } = base('file');

        ctx.rules.push(checks.file.is);
        api.client.set({ max: 1 });

        ctx.sub.schema = {
          id: types.string(),
          name: types.string(),
          url: types.url(),
          size: types.number(),
          type: types.string()
        };

        api.types = (types) => {
          const acceptedTypes = Array.isArray(types) ? types : String(types).split(',').map(t => t.trim());
          ctx.rules.push(checks.file.types(acceptedTypes));
          ctx.client.accept = acceptedTypes.join(',');
          return api;
        };

        api.size = (mx) => {
          ctx.rules.push(checks.file.size(mx));
          ctx.client.maxsize = mx;
          return api;
        };

        return api;
      }

    };

    const validateComplete = (scheme, obj, model) => {
      const results = { errors: [], item: {}, hasError: false };
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;
        const evaluated = sch.evaluate(value, model);
        results.item[key] = evaluated;
        results.hasError = results.hasError || evaluated.hasError;
      });

      return results;
    };

    /** @type {AsvValidate} */
    const validate = (schema, obj, { throwError } = {}) => {
      const results = validateComplete(schema, obj, obj);
      if (throwError && results.hasError)
        throw new Error(JSON.stringify(results));

      return results;
    };

    /** @type {AsvApply} */
    const applyComplete = (scheme, obj, model, { isNew, noStringify }) => {
      const newObj = {};
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;

        newObj[key] = sch.apply(value, model, { isNew, noStringify });
      });

      return newObj;
    };

    const execComplete = (scheme, obj, model, { isNew, noStringify }) => {
      const newObj = {};
      const results = {};
      let hasError = false;
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;
        const { storage, validation } = sch.exec(value, model, { isNew, noStringify });

        newObj[key] = storage;
        results[key] = validation.errors;
        hasError = hasError || validation.hasError;
      });

      return { newObj, results, hasError };
    };

    /** @type {AsvExec} */
    const exec = (scheme, obj, { isNew, throwError }) => {
      const { newObj, results, hasError } = execComplete(scheme, obj, obj, { isNew });
      if (hasError && throwError)
        throw new Error(JSON.stringify(results));

      return newObj;
    };

    const errorsToArray = (results, path = '') => {
      // get array of failures with path and errors
      if (!results.hasError)
        return [];

      /** @type {{ path: string, errors: string[] }[]} */
      let errors = [];

      let topErrors = results.errors || [];
      if (topErrors.length > 0)
        errors.push({ path, errors: topErrors });

      const item = results.item || {};

      Object.entries(item).forEach(([key, res]) => {
        if (res.errors.length > 0)
          errors.push({ path: `${path}${key}`, errors: res.errors });

        if (Array.isArray(res.items))
          errors = [...errors, ...res.items.map((ch, i) => errorsToArray(ch, `${path}${key}[${i}].`)).flat()];

        if (res.item)
          errors = [...errors, ...errorsToArray(res, `${path}${key}.`)];
      });

      const items = results.items || [];
      items.forEach(res => {
        errors = [...errors, ...errorsToArray(res, path)];
      });

      return errors;
    };

    /** @type {AsvParse} */
    const parseComplete = (scheme, obj) => {
      const newObj = {};
      Object.entries(scheme).forEach(([key, sch]) => {
        const value = obj ? obj[key] : null;

        newObj[key] = sch.parse(value);
      });

      return newObj;
    };

    /** @type {AsvGenerate} */
    const genComplete = (scheme, obj, model, { empty }) => {
      Object.entries(scheme).forEach(([key, sch]) => {
        let value = empty ? null : sch.apply(null, model, { isNew: true });
        if (!isNullish(value) && typeof value === 'object' && sch.schema)
          value = genComplete(sch.schema, value, model);
        obj[key] = value;
      });
      return obj;
    };

    /** @type {AsvGetSchemaContext} */
    const build = (schema) => getContext(schema);

    /** @type {AsvFromRaw} */
    const fromRaw = (raw) => {
      const built = {};

      Object.entries(raw).forEach(([key, sch]) => {
        const creator = types[sch.type];
        if (!creator)
          throw new Error(`${sch.type} is not a valid AppsSchemaValidation type!`);

        const type = creator();

        if (sch.required) type.required();
        if (sch.max !== undefined) type.max(sch.max);
        if (sch.min !== undefined) type.min(sch.min);
        if (sch.default) type.default(sch.default);
        if (sch.update) {
          if (typeof sch.update === 'function')
            type.update(sch.update);
          else
            type.update(sch.update.fn, sch.update.msg);
        }

        if (sch.schema) type.schema(sch.schema);
        if (sch.resolver) type.resolver(sch.resolver);

        //File
        if (sch.types) type.types(sch.types);
        if (sch.size) type.size(sch.size);

        //Client
        if (sch.client) type.client.set(sch.client);

        built[key] = type;
      });

      return built;
    };

    /** 
     * @template R
     * 
     * @param {AsvRawSchema<R>} raw
     */
    const compile = (raw) => {
      
      const built = fromRaw(raw);
      return build(built);
    };

    /** @type {AsvGetSchemaContext} */
    const getContext = (schema) => {
      return {
        schema,
        test: (obj) => validate(schema, obj, { throwError: true }),
        apply: (obj, { isNew } = {}) => applyComplete(schema, obj, obj, { isNew }),
        validate: (obj, { throwError = false } = {}) => validate(schema, obj, { throwError }),
        exec: (obj, { isNew, throwError = true } = {}) => exec(schema, obj, { isNew, throwError }),
        errors: (obj) => errorsToArray(validate(schema, obj)),
        parse: (obj) => parseComplete(schema, obj),
        generate: (obj = {}, { empty = false } = {}) => genComplete(schema, obj, obj, { empty })
      };
    };

    return {
      ...types,
      build,
      compile
    };
  }

}