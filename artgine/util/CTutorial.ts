import { CEvent } from "../basic/CEvent.js";
import { CModal } from "../basic/CModal.js";
import { CUtil } from "../basic/CUtil.js";
import { CChecker } from "./CChecker.js";

export class CTutorial
{
    static eWait=
    {
        "Click":"Click",
        "KeyUp":"KeyUp",
        "ModalClose":"ModalClose",
        "Event":"Event"
    }
    static Exe(_type,_data,_html,_option ={})
    {
        const defaultOption = { pos: null, bodyClose: true,call:null,overlay:true };
        const option = { ...defaultOption, ..._option };

        let modal : CModal=null;
        if(_html!=null)
        {
            modal=new CModal();
            //modal.SetHeader("Info")
            modal.SetTitle(CModal.eTitle.None);
            modal.SetBody(_html);
            modal.SetZIndex(CModal.eSort.Top);
            modal.SetBodyClose(true);
            modal.SetOverlay(option.overlay);
            modal.SetBodyClose(option.bodyClose);

            modal.Open(CModal.ePos.Center);
            //modal.Close(1000*5);
        }
        

        return new Promise<boolean>(async (resolve, reject) => {

            if(option.call!=null)   option.call();
            if(_type==CTutorial.eWait.Click)
            {
                CUtil.ID(_data).addEventListener("click",()=>{
                    
                    if(modal!=null)   modal.Close();
                    resolve(true);
                    
                },{ once: true });
            }
            else if(_type==CTutorial.eWait.KeyUp)
            {
                // 특정 키(_data 예: "Enter", "a" 등)를 누를 때 resolve
                const handler = (e: KeyboardEvent) => {
                    if (e.keyCode === _data) {
                        document.removeEventListener("keyup", handler);
                        if(modal!=null)   modal.Close();
                        resolve(true);
                    }
                };
                document.addEventListener("keyup", handler);
            }
            else if(_type==CTutorial.eWait.ModalClose)
            {
                if(_data==null)
                {
                    modal.On(CEvent.eType.Close,()=>{
                        resolve(true);
                    });
                }
                else
                {
                    await CChecker.Exe(async ()=>{

                        if(CModal.FindModal(_data)!=null)
                            return false;
                        return true;
                    },0);
                    CModal.FindModal(_data).On(CEvent.eType.Close,()=>{
                        resolve(true);
                    });
                }
                
            }
        });

        

    }
}