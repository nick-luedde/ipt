interface SheetDataAccessModel extends ISheetDataAccess {
  collections: {
    Project: ISheetDataCollection<IProject>;
    // Deployment: ISheetDataCollection<IDeployment>;
    Timeline: ISheetDataCollection<ITimeline>;
    Item: ISheetDataCollection<IItem>;
    Comment: ISheetDataCollection<IComment>;
    User: ISheetDataCollection<IUser>;
    Config: ISheetDataCollection<IConfig>;
  }
}