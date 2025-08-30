import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CServerMain } from "https://06fs4dix.github.io/Artgine/artgine/network/CServerMain.js";
import { CRoomServer } from "https://06fs4dix.github.io/Artgine/artgine/server/CRoomServer.js";
CConsol.Log("Server Start", CConsol.eColor.gray);
new CRoomServer().SetServerMain(CServerMain.Main());
