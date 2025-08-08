import { CServerMain } from "../../artgine/network/CServerMain.js";
import { CBoardServer } from "../../artgine/server/CBoardServer.js";
import { CFileServer } from "../../artgine/server/CFileServer.js";
import { COAuthServer } from "../../artgine/server/COAuthServer.js";
import { CSingServer } from "../../artgine/server/CSingServer.js";
new CBoardServer().SetServerMain(CServerMain.Main());
new CSingServer().SetServerMain(CServerMain.Main());
new CFileServer().SetServerMain(CServerMain.Main());
new COAuthServer().SetServerMain(CServerMain.Main());
