import { CAlert } from "../artgine/basic/CAlert.js";
import { CServerMain } from "../artgine/network/CServerMain.js";
import { GetAppJSON } from "./MainFunc.js";
var gAppJSON = await GetAppJSON();
if (gAppJSON == null) {
    process.exit(1);
}
const parsed = gAppJSON.url ? new URL(gAppJSON.url) : null;
const port = Number(process.argv[2] ?? parsed?.port ?? '8050');
const pathname = parsed?.pathname ?? '/Artgine';
var gWebServer = new CServerMain(port, pathname, gAppJSON);
if (await gWebServer.Init()) {
    CAlert.E("server start error!");
    process.exit(1);
}
console.log(`\n서버 시작`);
console.log(`http://localhost:${port}${pathname}/proj/Home/Home.html\n`);
