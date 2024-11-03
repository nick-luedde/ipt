<template id="item-comment-edit-template">
  <section>
    <apps-input
      label="Comments"
      size="is-small"
      type="textarea"
      :disabled="isSaving"
      v-model="newComment"
    ></apps-input>
    <div class="buttons is-right">
      <button
        class="button is-small is-link mr-0"
        :class="{ 'is-loading': isSaving }"
        :disabled="!canComment"
        @click="handleSaveComment"
      >
        Post comment
      </button>
    </div>

    <article>
      <div
        v-for="comment in vm.comments"
        :key="comment.id"
        class="p-2 mb-2 light-border is-size-7"
        :class="{ 'has-background-light': deletingComments.includes(comment) }"
      >
        <div class="columns">
          <p class="column p-0">
            {{ comment.createdBy }} -
            {{ new Date(comment.createdDate).toLocaleDateString() }}
          </p>
          <p class="column is-narrow p-0">
            <button
              class="delete is-small"
              title="Remove comment"
              @click="handleDeleteComment(comment)"
            ></button>
          </p>
        </div>
        <p class="content" style="white-space: pre-wrap">
          {{ comment.comment }}
        </p>
      </div>
    </article>
  </section>
</template>

<script>
const ItemCommentEdit = {
  props: {
    vm: Object,
  },

  setup() {
    return {
      state: {
        app: store.state.app,
      },
    };
  },

  data() {
    return {
      newComment: "",
      isSaving: false,
      deletingComments: [],
    };
  },

  computed: {
    canComment() {
      return !this.isSaving && !!this.newComment;
    },
  },

  methods: {
    async handleSaveComment() {
      if (!this.newComment) return;

      this.isSaving = true;

      await this.vm.postComment(this.newComment);

      this.isSaving = false;
      this.newComment = "";
    },
    handleDeleteComment(comment) {
      const confirm = this.state.app.confirm;
      const context = this;

      confirm.title = "Delete item";
      confirm.description = "Are you sure you want to delete this comment?";
      confirm.caption = "Delete";
      confirm.confirmClasses = "is-danger";

      confirm.action = async () => context.handleRemoveComment(comment);

      confirm.show = true;
    },
    async handleRemoveComment(comment) {
      const isDeleting = this.deletingComments.includes(comment);
      if (isDeleting) return;

      this.deletingComments.push(comment);

      await this.vm.deleteComment(comment);

      this.deletingComments = this.deletingComments.filter(
        (com) => com.id !== comment.id
      );
    },
  },

  template: document.querySelector("#item-comment-edit-template").innerHTML,
};

app.component("item-comment-edit", ItemCommentEdit);
</script>