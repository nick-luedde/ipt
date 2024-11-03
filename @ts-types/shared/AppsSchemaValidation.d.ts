type Asv = ReturnType<typeof AppsSchemaValidation.asv>;

type AsvSchemeType = 'any' | 'id' | 'string' | 'url' | 'number' | 'boolean' | 'date' | 'datestring' | 'datetimestring' | 'jsondate' | 'timestamp' | 'audit' | 'array' | 'object' | 'file';
type AsvStorable = string | number | null | undefined;

interface AsvSchemaContext<S extends AsvSchema> {
  schema: S;
  test: <T>(obj: T) => AsvValidation<T>;
  apply: <T>(obj: T, { isNew }: { isNew: boolean }) => T;
  validate: <T>(obj: T, { throwError }: { throwError: boolean }) => AsvValidation<T>;
  exec: <T>(obj: T, { isNew, throwError }: { isNew: boolean, throwError: boolean }) => T;
  errors: (obj: any) => ReturnType<AsvErrors>;
  parse: <T>(obj: T) => T;
  generate: <T>(obj: T, { empty }: { empty: boolean }) => T;
}

type AsvGetSchemaContext = <S>(schema: S) => AsvSchemaContext<S>;

interface BaseAsvTypeContext<Type> {
  type: AsvSchemeType;
  rules: ((val: Type, mdl?: unknown) => string | false)[];
  client: { [key: string]: string | boolean | number };
  defaultFn?: () => Type;
  updateFn?: <M>(mdl: M) => Type;
  valid: {
    msg: string;
    check?: <M>(val: any, mdl: M) => boolean
    isValid: <M>(val: any, mdl: M) => boolean;
  };
  resolver?: (val: any) => Type;
  sub: {
    schema: unknown; //figure this out later
    isSimple: boolean;
  };
}

interface BaseAsvType<Type, Rtn> {
  required: () => Rtn;
  max?: (mx: number) => Rtn;
  min?: (mn: number) => Rtn;
  default?: (fn: () => Type | null) => Rtn;
  update?: (fn: () => Type | null) => Rtn;
  valid?: (fn: (mdl: any) => boolean, msg?: string) => Rtn;
  resolver?: (fn: <T>(val: T) => Type) => Rtn;
  schema?: (obj: unknown) => Rtn;
  client: {
    get: StringObject,
    set: (key: string, val: string) => Rtn;
  };

  evaluate: (val: Type, mdl: unknown) => AsvValidation<Type>;
  apply: (val: Type, model: unknown, options?: { isNew: boolean }) => Type,
  exec: (val: Type, model: unknown, options?: { isNew?: boolean, noStringify: boolean }) => { validation: AsvValidation<Type>, storage: AsvStorable };
  parse: (val: AsvStorable) => Type;
}

type AsvAnyApi<Rtn> = BaseAsvType<object | any[], Rtn>;
interface AsvAny extends AsvAnyApi<AsvAny> { };

type AsvIdApi<Rtn> = Pick<BaseAsvType<string, Rtn>, "client">;
interface AsvId extends AsvIdApi<AsvId> { };

type AsvStringApi<Rtn> = Omit<BaseAsvType<string, Rtn>, "resolver" | "schema" | "max" | "min">;
interface AsvString extends AsvStringApi<AsvString> { infer: string };
interface AsvUrl extends AsvStringApi<AsvUrl> { infer: string };

type AsvNumberApi<Rtn> = Omit<BaseAsvType<number, Rtn>, "resolver" | "schema">;
interface AsvNumber extends AsvNumberApi<AsvNumber> { infer: number };

type AsvBooleanApi<Rtn> = Omit<BaseAsvType<boolean, Rtn>, "resolver" | "schema" | "minlength" | "maxlength" | "max" | "min">;
interface AsvBoolean extends AsvBooleanApi<AsvBoolean> { infer: boolean };

type AsvDateApi<Rtn> = Omit<BaseAsvType<Date, Rtn>, "resolver" | "schema">;
interface AsvDate extends AsvDateApi<AsvDate> { infer: Date };

interface AsvDateString extends AsvStringApi<AsvDateString> { };
interface AsvDateTimeString extends AsvStringApi<AsvDateTimeString> { };
interface AsvJsonDate extends AsvStringApi<AsvJsonDate> { };

type AsvTimestampApi<Rtn> = Omit<BaseAsvType<string, Rtn>, "resolver" | "schema" | "min" | "max">;
interface AsvTimestamp extends AsvTimestampApi<AsvTimestamp> { infer: string };

type AsvAuditApi<Rtn> = Omit<BaseAsvType<string, Rtn>, "resolver" | "schema" | "min" | "max">;
interface AsvAudit extends AsvAuditApi<AsvAudit> { infer: string };

interface AsvArray<Type> extends BaseAsvType<Array<Type>, AsvArray<Type>> { infer: Type[] };
interface AsvObject<Type> extends BaseAsvType<Type, AsvObject<Type>> { };

type AsvFileObject = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
};
interface AsvFile<Type = AsvFileObject> extends BaseAsvType<Array<Type>, AsvFile<Type>> {
  size?: (ms: number) => AsvFile<Type>;
  types?: (types: string | string[]) => AsvFile<Type>;
};

type AsvValidation<Type> = Type extends any[]
  ? AsvValidationArray<Type>
  : Type extends object
  ? AsvValidationObject<Type>
  : AsvValidationPrimitive;

type AsvValidationPrimitive = { errors: string[], hasError: boolean };
type AsvValidationObject<Type> = { item: { [Prop in keyof Type]: AsvValidation<Type[Prop]> } } & AsvValidationPrimitive;
type AsvValidationArray<Type> = { items: AsvValidation<Type extends (infer Inner)[] ? Inner : never>[] } & AsvValidationPrimitive;

type AsvValidate = <T, S>(schema: S, obj: T, options: { throwError: boolean }) => AsvValidation<T>;

type AsvApply = <T, S>(scheme: S, obj: T, model: TaskModelDetail, { isNew, noStringify }: { isNew: boolean, noStringify: boolean }) => T;

type AsvExec = <T, S>(scheme: S, obj: T, { isNew, throwError }: { isNew: boolean, throwError: boolean }) => T;

type AsvErrors = (obj: any) => { path: string, errors: string[] }[];

type AsvParse = <T, S>(scheme: S, obj: T) => T;

type AsvGenerate = <T>(scheme: S, obj: T, obj: T, { empty }: { empty: boolean }) => T;

// interface AsvSchema {
//   [key: string]: AsvAny;
// };

type AsvRawSchemaObject = {
  [key: string]: {
    [key: string]: AsvRawType;
  }
};

type AsvRawType = {
  type: AsvSchemeType
  required?: boolean;
  max?: number;
  min?: number;
  default?: () => any;
  update?: () => any;
  valid?: (mdl: any) => boolean;
  resolver?: (val: any) => any;
  types?: string | string[];
  size?: number;
  schema?: AsvRawType;
  client?: StringObject;
};

type AsvRawSchema<R extends AsvRawSchema<R>> = {
  [Prop in keyof R]: AsvRawType;
};


type AsvRawToSchema<R> = {
  [Prop in keyof R]: AsvAny;
};

type AsvFromRaw = <R>(raw: R) => AsvRawToSchema<R>;

//TODO: could keep working on this definition... 
type SchemaToRaw<Scheme> = {
  [Prop in keyof Scheme]: Scheme[Prop] extends { infer: any } ? Scheme[Prop]["infer"] : SchemaToRaw<Scheme[Prop]>;
};

interface AsvSchema {
  [key: string]: AsvSchemaContext;
}


// const example_obj = {
//   name: 'test',
//   arr: [{ val: 123 }],
//   obj: {
//     desc: 'Description',
//     list: ['1', '2'],
//     check: true,
//     term: {
//       a: 'a',
//       b: 'b'
//     }
//   }
// };

// const validation_example_1 = {
//   item: {
//     name: { errors: [], hasErrors: false },
//     arr: {
//       errors: [], hasErrors: true, items: [
//         { val: { errors: ['Is not a string'], hasError: true } }
//       ]
//     },
//     obj: {
//       errors: [],
//       hasError: false,
//       item: {
//         desc: { errors: [], hasError: false },
//         list: {
//           errors: [], hasError: false, items: [
//             { errors: [], hasError: false },
//             { errors: [], hasError: false },
//           ]
//         },
//         check: { errors: [], hasError: false }
//       }
//     }
//   },
//   errors: [''],
//   hasError: true,
// };

// const validation_example_2 = [
//   {
//     errors: ['Not a string'],
//     path: ['test']
//   },
//   {
//     errors: [],
//     path: ['arr', '0']
//   },
//   {
//     errors: ['Too short'],
//     path: ['obj', 'term', 'a']
//   },
//   {
//     errors: ['Hey'],
//     path: ['obj', 'check']
//   }
// ];

// // so if I were to map this type of error to a UI element?
// const model = {
//   vmodel: example_obj.obj.desc,
//   path: ['obj', 'desc'],
// };

// const find_errors = (find: string[]) => {
//   const joined= find.join('');
//   return validation_example_2.find(({ path }) => path.join('') === joined);
// };

// const unwrap_path = (path: string[], obj: object) => {
//   let val = obj;
//   if (val === undefined || val === null) return;

//   for (const p of path) {
//     val = val[p];
//     if (val === undefined)
//       return undefined;
//   }

//   return val;
// };

// const asv = AppsSchemaValidation.asv();

// const scheme = {
//   str: asv.string(),
//   num: asv.number(),
//   obj: asv.object().schema({
//     one: asv.string(),
//     two: asv.array().schema(asv.string())
//   })
// };

// scheme.str.infer()

// type tst = SchemaToRaw<typeof scheme>;