import { CRoomServer } from "../artgine/server/CRoomServer.js";
import { CServer, CServerMain } from "../artgine/network/CServerMain.js";
import { CSingServer } from "../artgine/server/CSingServer.js";
import { CBoardServer } from "../artgine/server/CBoardServer.js";
import { CFileServer } from "../artgine/server/CFileServer.js";
import { COAuthServer } from "../artgine/server/COAuthServer.js";


export function ImportServer(_main : CServerMain)
{
    new CRoomServer().SetServerMain(_main);
    new CSingServer().SetServerMain(_main);
    new CBoardServer().SetServerMain(_main);
    new CFileServer().SetServerMain(_main);
    new COAuthServer().SetServerMain(_main);
   

}
