import { CCMDMgr } from "./CCMDMgr.js";
if (CCMDMgr.IsTSC() == false) {
    await CCMDMgr.RunCMD("npm install", false);
    await CCMDMgr.RunCMD("npx tsc", false);
}
await CCMDMgr.RunCMD("npx electron .", false);
