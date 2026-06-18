import { CConsol } from "../../artgine/basic/CConsol.js";

import { CServerMain } from "../../artgine/network/CServerMain.js";
import { CBoardServer } from "../../artgine/server/CBoardServer.js";

import { CFileServer } from "../../artgine/server/CFileServer.js";
import { COAuthServer } from "../../artgine/server/COAuthServer.js";
import { CSingServer } from "../../artgine/server/CSingServer.js";
import { CTerminalRouter } from "../../artgine/server/CTerminalRouter.js";
import { CDownloadServer } from "../../artgine/server/CDownloadServer.js";
import { CAIChatRouter } from "../../artgine/server/CAIChatRouter.js";
import { CPlaywrightRouter } from "../../artgine/server/CPlaywrightRouter.js";



// 로그인 (Sing / OAuth),보드,다운로드
// ==================================================================================================================
new CSingServer().SetServerMain(CServerMain.Main());
new COAuthServer().SetServerMain(CServerMain.Main());
new CBoardServer().SetServerMain(CServerMain.Main());
new CDownloadServer().SetServerMain(CServerMain.Main());

// ---- 기타 라우터 ----
new CFileServer().SetServerMain(CServerMain.Main());
new CTerminalRouter().SetServerMain(CServerMain.Main());
new CAIChatRouter().SetServerMain(CServerMain.Main());
new CPlaywrightRouter().SetServerMain(CServerMain.Main());
//new CTerminalSocket().SetServerMain(CServerMain.Main());


