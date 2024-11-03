import { PropType } from "vue";

type UserViewModel = ReturnType<typeof useUserViewModel>;
type ItemViewModel = ReturnType<typeof useItemViewModel>;

namespace ViewModelProps {
  type UserViewModelProp = PropType<UserViewModel>;
  type ItemViewModelProp = PropType<ItemViewModel>;
}