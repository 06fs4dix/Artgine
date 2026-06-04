
import { CCMDMgr } from "./CCMDMgr.js";
if (CCMDMgr.IsTSC() == false || CCMDMgr.GetFileCount("node_modules")==0)
{
    await CCMDMgr.RunCMD("npm install --production", false);
	await CCMDMgr.RunCMD("npx tsc", false);
}
await CCMDMgr.RunCMD("git submodule update --remote --force", false);
await CCMDMgr.RunCMD("npx electron .", false);


                