import { CServerMain } from "../../artgine/network/CServerMain.js";
import { CAIChatRouter } from "../../artgine/server/CAIChatRouter.js";
import { CAIInfoRouter } from "../../artgine/server/CAIInfoRouter.js";
import { CDownloadServer } from "../../artgine/server/CDownloadServer.js";
import { CFileServer } from "../../artgine/server/CFileServer.js";
import { CMemoRouter } from "../../artgine/server/CMemoRouter.js";
import { CORMRouter } from "../../artgine/server/CORMRouter.js";
import { CPlaywrightRouter } from "../../artgine/server/CPlaywrightRouter.js";
import { CRemoteDesktopRouter } from "../../artgine/server/CRemoteDesktopRouter.js";
import { CTerminalRouter } from "../../artgine/server/CTerminalRouter.js";

new CDownloadServer().SetServerMain(CServerMain.Main());
new CFileServer().SetServerMain(CServerMain.Main());
new CTerminalRouter().SetServerMain(CServerMain.Main());
new CAIInfoRouter().SetServerMain(CServerMain.Main());
new CAIChatRouter().SetServerMain(CServerMain.Main());
new CPlaywrightRouter().SetServerMain(CServerMain.Main());
new CRemoteDesktopRouter().SetServerMain(CServerMain.Main());
new CMemoRouter().SetServerMain(CServerMain.Main());
new CORMRouter().SetServerMain(CServerMain.Main());


