import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CServerMain } from "https://06fs4dix.github.io/Artgine/artgine/network/CServerMain.js";
import { CScoreServer } from "https://06fs4dix.github.io/Artgine/artgine/server/CScoreServer.js";
CConsol.Log("Server Start", CConsol.eColor.gray);
new CScoreServer().SetServerMain(CServerMain.Main());
