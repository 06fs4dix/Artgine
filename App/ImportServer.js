import { CRoomServer } from "../artgine/server/CRoomServer.js";
import { CUserRestAPI } from "../artgine/server/CUserRestAPI.js";
var gServerArr = new Array();
export function ImportServer(_main) {
    let room = new CRoomServer();
    room.SetServerMain(_main);
    room.Connect();
    gServerArr.push(room);
    let user = new CUserRestAPI();
    user.SetServerMain(_main);
    user.Connect();
}
export function DestroyServer() {
    for (let server of gServerArr) {
        server.Destroy();
    }
    gServerArr = [];
}
