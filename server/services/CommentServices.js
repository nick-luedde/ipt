class CommentServices {

  /**
   * Saves comment to datasource
   * @param {IComment} comment - comment to save
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveComment(comment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const item = datasource.collections.Item.data()
      .find(itm => itm.id === comment.item);

    if (!item)
      throw new ApiError(`Item with id ${comment.item} not found!`, { code: 404 });

    //save item to update metadata
    const [savedItem] = datasource.collections.Item.update([item]);

    const savedComment = datasource.collections.Comment.upsertOne(comment);

    return {
      comment: savedComment,
      item: savedItem
    };
  }

  /**
   * Requests to delete an existing comment in the datasource
   * @param {IComment} comment - object containing all properties of a Comment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteComment(comment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    datasource.collections.Comment.delete([comment]);

    return null;
  }

  /**
   * Checks a comment text for tagged emails (ie @email@whatever.com)
   * @param {string} comment - comment string to check for tagged emails
   */
  static getValidCommetTaggedEmails(commentText) {
    //validate if comment contains emails to send
    const pattern = /@[^\s]+(@.*)/g;
    const matches = commentText.match(pattern);

    if (!matches)
      return [];

    const validEmails = matches.map(email => {
      const emailWithoutTag = email.slice(1);
      const contacts = ContactsApp.getContactsByEmailAddress(emailWithoutTag);

      if (contacts.length === 0)
        return null;

      return emailWithoutTag;
    }).filter(email => email !== null);

    return validEmails;
  }

  /**
   * Emails a comment to the defined emails...
   * @param {IComment} comment - comment
   * @param {SheetDataAccessModel} datasource - data access object
   */
  static emailComment(comment, datasource) {

    //eat errors so emailing doesnt break any outside functionality
    try {

      const validEmails = CommentServices.getValidCommetTaggedEmails(comment.comment);

      if (validEmails.length === 0)
        return;

      const item = datasource.collections.item.find({
        where: 'id',
        is: comment.item
      });
      const project = datasource.collections.project.find({
        where: 'id',
        is: item.project
      });

      const config = CurrentEnvironment.config();
      const itemUrl = `${config.appUrl}?itemId=${item.id}`;

      const template = HtmlService.createTemplate(`
      <p style="font-size: 1.2rem; margin-bottom: .25rem;">Information Services project '<?= project.name ?>'</p>
      <br>
      <p>A new comment has been added to the work item '<?= item.name ?>'</p>
      <br>
      <div style="padding=.2rem; border: 1px solid black">
        <p>Comment:</p>
        <p> - <?= comment.comment ?></p>
      </div>
      <br>
      <a href="<?= itemUrl ?>">Open this item in the Information Services projects app</a>
    `);
      template.item = item;
      template.project = project;
      template.comment = comment;
      template.itemUrl = itemUrl;

      const htmlBody = template.evaluate().getContent();

      MailApp.sendEmail({
        to: validEmails.join(','),
        subject: `Information Services work item comment - ${(new Date()).toJSON()}`,
        htmlBody: htmlBody
      });

    } catch (error) {
      console.log(error);
    }

  }

}