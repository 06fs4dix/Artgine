import { CAlert } from "../artgine/basic/CAlert.js";
import { CServerMain } from "../artgine/network/CServerMain.js";
import { GetAppJSON } from "./AppFunc.js";
var gAppJSON = await GetAppJSON();
if (gAppJSON == null) {
    process.exit(1);
}
const parsed = new URL(gAppJSON.url);
const port = parsed.port;
const pathname = parsed.pathname;
var gWebServer = new CServerMain(Number(port), pathname, gAppJSON.projectPath);
if (await gWebServer.Init()) {
    CAlert.E("server start error!");
    process.exit(1);
}
