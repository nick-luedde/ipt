type ValueType<Type> = { value: Type };

type KeyedObject<Type> = { [key: string]: Type };
type UnwrapValue<Type> = Type extends ValueType<(infer Inner)> ? Inner : Type;

type IdentityFunction = <T>(t: T) => { [Prop in keyof T]: UnwrapValue<T[Prop]> };
type IdentityValueFunction = <Type>(arg: (() => Type) | Type) => ValueType<Type>;

type TypeOfVue = typeof Vue;

interface VueOverrides extends TypeOfVue {
  ref: IdentityValueFunction;
  reactive: IdentityFunction;
  computed: IdentityValueFunction;
};