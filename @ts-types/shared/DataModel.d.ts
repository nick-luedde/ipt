type IItemType = 'Bug' | 'Issue' | 'Enhancement' | 'Feature' | 'Epic' | 'Story' | 'Task' | 'Accessibility' | 'Planning' | 'Support';

interface IAppsAuditable {
  _key: string;
  modifiedDate?: string;
  modifiedBy?: string;
  createdDate?: string;
  createdBy?: string
}

interface IProject extends IAppsAuditable {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  categories: string[];
  platforms: string[];
  dependsOnProjects: string[];
  priority: string;
  accessibilityStatus: string;
  iteration: string;
  planningNotes: string;
  program: string;
  hasPII: boolean;
  links: {
    name: string;
    url: string;
    type: string;
  }[],
  owner: string;
  backup: string;
  isPublic: boolean;
}

interface IDeployment extends IAppsAuditable {
  id: string;
  project: string;
  description: string;
  version: string;
  owner: string;
  scheduled: string;
  date: string;
  tags: string[];
  notes: string;
}

interface ITimeline extends IAppsAuditable {
  id: string;
  projects: string[];
  name: string;
  description: string;
  status: string;
  effort: number;
  priority: number;
  magnitude: number;
  impacts: string[];
  notes: string;
  startDate: string;
  endDate: string;
}

interface IItem extends IAppsAuditable {
  id: string;
  itemNumber: number;
  project: string;
  parent: string;
  name: string;
  description: string;
  tags: string[];
  files: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  };
  version: string;
  type: IItemType;
  priority: string;
  status: string;
  scheduledDate: string;
  hours: number;
  resolvedDate: string;
  closedDate: string;
  assignee: string;
}

interface IComment extends IAppsAuditable {
  id: string;
  item: string;
  comment: string;
}

interface IUser {
  _key: string;
  id: string;
  email: string;
  role: 'admin' | 'service';
  settings: {
    favoriteProjects: string[];
    theme: 'Light' | 'Dark';
    queue: string[];
  };
  createdDate: string;
}

interface IConfig {
  _key: string;
  id: string;
  json: object;
}