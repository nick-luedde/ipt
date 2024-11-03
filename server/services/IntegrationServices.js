class IntegrationServices {

  /**
   * Sends an email for a given item
   * @param {IItem} item - item object to send email for
   * @param {{ to: string, cc: string, message: string, noReply: boolean }} emailMessage - object defining the properties of the message to send (To, Cc, Message)
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static sendItemEmail({ item, emailMessage }, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const {
      message,
      to,
      cc,
      noReply
    } = emailMessage;

    const project = datasource.collections.Project.data()
      .find(project => project.id === item.project);

    const config = CurrentEnvironment.config();
    const itemUrl = `${config.appUrl}/item/${item.id}`;

    const template = HtmlService.createTemplate(`
    <p style="font-size: 1.2rem; margin-bottom: .25rem;">Information Services project: '<?= project.name ?>'</p>
    <p>Work item notification: '[<?= item.itemNumber ?>] - <?= item.name ?>'</p>
    <hr>
    <p>Message:</p>
    <p><?= message ?></p>
    <br>
    <a href="<?= itemUrl ?>">Open this item in the Information Services-Projects app</a>
  `);
    template.project = project;
    template.item = item;
    template.message = message;
    template.itemUrl = itemUrl;

    const htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({
      to,
      cc,
      noReply,
      subject: `Information Services item [${item.itemNumber}] - ${(new Date()).toJSON()}`,
      htmlBody
    });

    return null;
  }

  /**
   * Creates an item calendar event
   * @param {IItem} item - item to create even
   * @param {string} startTimeString - [YYYY-MM-ddThh:mm:ss] time to start event
   */
  static createItemCalendarEvent({ item, startTimeString }) {
    const start = new Date(startTimeString);

    if (Number.isNaN(start.getDate()))
      throw new ApiError(`${startTimeString} is not a valid date string!`, { code: 400 });

    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const event = {
      summary: `[${item.itemNumber}] - ${item.name}`,
      description: item.description || '',
      start: {
        dateTime: start.toISOString()
      },
      end: {
        dateTime: end.toISOString()
      },
      colorId: CalendarApp.EventColor.MAUVE,
      transparency: 'transparent'
    };

    const response = Calendar.Events.insert(event, 'primary');

    return response;
  }

}