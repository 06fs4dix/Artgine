import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CServerMain } from "../../../artgine/network/CServerMain.js";

import { CScoreServer } from "../../../artgine/server/CScoreServer.js";

CConsol.Log("Server Start",CConsol.eColor.gray);
new CScoreServer().SetServerMain(CServerMain.Main());