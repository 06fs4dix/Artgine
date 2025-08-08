import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CServerMain } from "../../../artgine/network/CServerMain.js";
import { CRoomServer } from "../../../artgine/server/CRoomServer.js";

CConsol.Log("Server Start",CConsol.eColor.gray);
new CRoomServer().SetServerMain(CServerMain.Main());