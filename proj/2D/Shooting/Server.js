import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CServerMain } from "../../../artgine/network/CServerMain.js";
import { CRoomServer } from "../../../artgine/server/CRoomServer.js";
import { CScoreServer } from "../../../artgine/server/CScoreServer.js";
CConsol.Log("Server Start", CConsol.eColor.gray);
new CRoomServer().SetServerMain(CServerMain.Main());
new CScoreServer().SetServerMain(CServerMain.Main());
