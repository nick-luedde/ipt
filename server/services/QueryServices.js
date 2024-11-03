class QueryServices {

  static getWebRequestsWithFiles() {
    const ds = CurrentEnvironment.datasource();

    const items = ds.collections.Item.data()
      .filter(itm => itm.project === '4e68ae84-a9ce-4aa3-9266-5df2ee698349');

    const cindex = ds.collections.Comment.index('item');

    const adt = AppsDateTime.adt();
    const start = adt.build({ year: 2024, month: 1, day: 1 });
    const end = adt.build({ year: 2024, month: 3, day: 26 });

    let count = 0;
    let fileCount = 0;

    const docRequests = items.filter(itm => {
      const cmt = cindex[itm.id];
      const created = new Date(itm.createdDate);

      if (!cmt) return false;
      if (created <= start || created >= end) return false;

      const files = itm.files;

      const records = [...cmt.comment.matchAll(/Please upload the document for this record/g)];
      const handles = [...cmt.comment.matchAll(/OnBase Document Handle:/g)];

      const docsRequested = records.length + (handles.length * 1.5);

      count += docsRequested;
      fileCount += files.length;

      return files.length > 0 || docsRequested > 0;
    });

    console.log(count);
    console.log(fileCount);
    console.log(count + fileCount);
  }

}