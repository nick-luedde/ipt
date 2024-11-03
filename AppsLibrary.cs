using System;
using System.Diagnostics;
using System.IO;
using System.Collections.Generic;
using System.Linq;

class AppsLibrary
{
  static void Main(string[] args)
  {
    if (args.Length == 0)
      throw new ArgumentException("Missing arguments!");

    List<string> arglist = args.ToList();
    string action = arglist[0];

    string[] arguments = arglist.Skip(1).ToArray();

    // Build action is local so you don't have to be on VPN
    // All other actions pass along to the AppsPackageManager (Which you must be on vpn to use)
    switch (action.ToLower())
    {
      case "-build":
      case "-b":
        BuildAction(arguments);
        break;
    }
  }

  static void BuildAction(string[] args)
  {
    if (args.Any(a => a == "-c" || a == "-client"))
      ClientBuild.Build(args);
    if (args.Any(a => a == "-s" || a == "-server"))
      ServerBuild.Build(args);

    if (args.Any(a => a == "-a" || a == "-all"))
    {
      ClientBuild.Build(args);
      ServerBuild.Build(args);
    }
  }
}

class Helpers
{
  public static string DirectoryFileContent(string path, bool subDirs = true, Func<FileInfo, string, string> wrapper = null)
  {
    if (!Directory.Exists(path))
      return "";

    DirectoryInfo root = new DirectoryInfo(path);
    DirectoryInfo[] dirs = root.GetDirectories("*.*", SearchOption.AllDirectories);
    string txt = "";

    FileInfo[] rootFiles = root.GetFiles();

    if (subDirs)
    {
      foreach (DirectoryInfo dir in dirs)
      {
        FileInfo[] files = dir.GetFiles();

        foreach (FileInfo file in files)
        {
          Console.WriteLine($"file: {file.Name}");
          if (wrapper != null)
          {
            txt += wrapper(file, File.ReadAllText(file.FullName)) + "\n";
          }
          else
          {
            txt += File.ReadAllText(file.FullName) + "\n";
          }
        }

      }
    }

    foreach (FileInfo file in rootFiles)
    {
      Console.WriteLine($"file: {file.Name}");
      if (wrapper != null)
      {
        txt += wrapper(file, File.ReadAllText(file.FullName)) + "\n";
      }
      else
      {
        txt += File.ReadAllText(file.FullName) + "\n";
      }
    }

    return txt;
  }
}

class ClientBuild
{
  public static void Build(string[] args)
  {

    bool isLocal = args.Any(a => a == "-l");
    bool isProd = !isLocal && args.Any(a => a == "-p");
    string env = isLocal ? "local" : isProd ? "prod" : "dev";

    Dictionary<string, string> envs = new Dictionary<string, string>()
    {
      { "prod", "production" },
      { "dev", "development" },
      { "local", "local" }
    };

    const string COMPONENT_DIR = "./client/components";
    const string JS_DIR = "./client/js";
    const string CSS_DIR = "./client/css";
    const string MAIN_DIR = "./client/main";
    const string PACKAGES_DIR = "./client/packages";
    const string WORKERS_DIR = "./client/workers";
    const string DIST_DIR = "./build";
    const string SHARED_DIR = "./shared";

    string dist = File.ReadAllText(Path.Combine(MAIN_DIR, "index.html"));

    // Get all files in the components director and all of its sub directories
    string components = Helpers.DirectoryFileContent(COMPONENT_DIR, true, (file, text) => text.Replace("export default {", $"const {Path.GetFileNameWithoutExtension(file.Name)} = {{"));
    dist = dist.Replace("{{# components }}", components);

    // Get the Vue source code files
    dist = dist.Replace("{{# vue }}", !isProd
      ? "<script src=\"https://unpkg.com/vue@3\"></script>\n<script src=\"https://unpkg.com/vue-router@4\"></script>"
      : "<script src=\"https://unpkg.com/vue@3.5.9/dist/vue.global.prod.js\"></script>\n<script src=\"https://unpkg.com/vue-router@4.4.5/dist/vue-router.global.prod.js\"></script>");

    // Get app worker-js files
    string work = Helpers.DirectoryFileContent(WORKERS_DIR, true, (file, text) => $"<script type=\"text/js-worker\" id=\"worker-{Path.GetFileNameWithoutExtension(file.Name)}\">\n" + text + "\n</script>");
    dist = dist.Replace("{{# workers }}", work);

    // Get app js files
    string sharedJs = Helpers.DirectoryFileContent(SHARED_DIR);
    string js = Helpers.DirectoryFileContent(JS_DIR);
    dist = dist.Replace("{{# js }}", $"<script>\n{sharedJs}\n{js}\n</script>");

    // Get app js files
    string packages = Helpers.DirectoryFileContent(PACKAGES_DIR, subDirs: false);
    dist = dist.Replace("{{# packages }}", $"<script>\n{packages}\n</script>");

    // Get app.js file
    string main = File.ReadAllText(Path.Combine(MAIN_DIR, "app.js"));
    dist = dist.Replace("{{# app }}", $"<script>\n{main}\n</script>");

    // Get index.js file
    string index = File.ReadAllText(Path.Combine(MAIN_DIR, "index.js"));
    dist = dist.Replace("{{# index }}", $"<script>\n{index}\n</script>");

    // Get css files
    string css = Helpers.DirectoryFileContent(CSS_DIR);
    dist = dist.Replace("{{# css }}", $"<style>\n{css}\n</style>");

    //Write all to the dist/index.html file
    File.WriteAllText(Path.Combine(DIST_DIR, "index.html"), dist);

    Console.WriteLine($"completed {DateTime.Now}");
    Console.ForegroundColor = isLocal ? ConsoleColor.Blue : isProd ? ConsoleColor.Red : ConsoleColor.Green;
    Console.WriteLine($"[Client] {envs[env]} build!");

    Console.ResetColor();
  }
}

class ServerBuild
{
  public static void Build(string[] args)
  {

    bool isLocal = args.Any(a => a == "-l");
    bool isProd = !isLocal && args.Any(a => a == "-p");
    string env = isLocal ? "local" : isProd ? "prod" : "dev";

    Dictionary<string, string> envs = new Dictionary<string, string>()
    {
      { "prod", "production" },
      { "dev", "development" },
      { "local", "local" }
    };

    const string DATA_DIR = "./server/data";
    const string INTEGRATIONS_DIR = "./server/integrations";
    const string LIB_DIR = "./server/lib";
    const string SERVICES_DIR = "./server/services";
    const string UTILS_DIR = "./server/utils";
    const string ROOT_DIR = "./server";
    const string DIST_DIR = "./build";
    const string SHARED_DIR = "./shared";

    string dist = "";

    string libJs = Helpers.DirectoryFileContent(LIB_DIR);
    dist += libJs + "\n";

    string utilsJs = Helpers.DirectoryFileContent(UTILS_DIR);
    dist += utilsJs + "\n";

    string sharedJs = Helpers.DirectoryFileContent(SHARED_DIR);
    dist += sharedJs + "\n";

    string integrationsJs = Helpers.DirectoryFileContent(INTEGRATIONS_DIR);
    dist += integrationsJs + "\n";

    string dataJs = Helpers.DirectoryFileContent(DATA_DIR);
    dist += dataJs + "\n";

    if (File.Exists(Path.Combine(ROOT_DIR, "ConfigEnv.js")))
    {
      string configJs = File.ReadAllText(Path.Combine(ROOT_DIR, "ConfigEnv.js"))
        .Replace("// {{# configurationTemplate }}", $"return ConfigurationFactory.{envs[env]}Config();");
      dist += configJs + "\n";
    }

    string servicesJs = Helpers.DirectoryFileContent(SERVICES_DIR);
    dist += servicesJs + "\n";

    if (File.Exists(Path.Combine(ROOT_DIR, "server.js")))
    {
      string serverJs = File.ReadAllText(Path.Combine(ROOT_DIR, "server.js"));
      dist += serverJs + "\n";
    }

    //Write all to the dist/index.html file
    File.WriteAllText(Path.Combine(DIST_DIR, "index.js"), dist);

    Console.WriteLine($"completed {DateTime.Now}");
    Console.ForegroundColor = isLocal ? ConsoleColor.Blue : isProd ? ConsoleColor.Red : ConsoleColor.Green;
    Console.WriteLine($"[Server] {envs[env]} build!");

    Console.ResetColor();
  }

}