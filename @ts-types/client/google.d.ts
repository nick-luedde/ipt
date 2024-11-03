type ValidGoogleAppsScriptArg = number
  | string
  | boolean
  | null
  | undefined
  | { [key: string]: ValidGoogleAppsScriptArg }
  | ValidGoogleAppsScriptArg[]
  | HTMLFormElement;

//location object
type GoogleAppsScriptClientLocation = {
  hash: string;
  parameter: { [key: string]: string };
  parameters: { [key: string]: string[] };
};

type GoogleAppsScriptClientObject = {
  script: {
    history: {
      /**
       * Pushes to browser history stack
       */
      push: (stateObject: object, params: { [key: string]: string | string[] }, hash: string ) => void;
      /**
       * Replaces top element on browser history stack
       */
      replace: (stateObject: object, params: { [key: string]: string | string[] }, hash: string ) => void;
      /**
       * Sets callback frunction for changes in browser history
       */
      setChangeHandler(fn: (e: { state: object, location: GoogleAppsScriptClientLocation }) => void);
    },
    host: {
      close: () => void;
      editor: { focus: () => void };
      setHeight: (height: number) => void;
      setWidth: (width: number) => void;
    },
    run: {
      /**
       * Sets callback if server throws exception
       */
      withFailureHandler: (fn: (err: Error) => void) => GoogleAppsScriptClientObject['script']['run'];
      /**
       * Sets callback if server return successfully
       */
      withSuccessHandler: (fn: (res: any) => void) => GoogleAppsScriptClientObject['script']['run'];
      /**
       * Sets object to pass as second param to success and failure handlers
       */
      withUserObject: (object: object) => GoogleAppsScriptClientObject['script']['run'];
      /**
       * Server side function
       */
      [key: string]: (...args: ValidGoogleAppsScriptArg[]) => void;
    },
    url: {
      /**
       * Gets url location object and passes to provided callback
       */
      getLocation: (fn: (loc: GoogleAppsScriptClientLocation) => void) => void;
    }
  }
};

declare var google: GoogleAppsScriptClientObject;