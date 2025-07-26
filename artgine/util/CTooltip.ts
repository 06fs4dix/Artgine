
import { Bootstrap } from "../basic/Bootstrap.js";
import { CEvent } from "../basic/CEvent.js";
import {CModal} from "../basic/CModal.js";
import {CUniqueID} from "../basic/CUniqueID.js";
import {CUtil} from "../basic/CUtil.js";

enum eTrigger {
    Hover,
    Click,
    Manual
};
enum ePlacement {
    Top,
    Bottom,
    Left,
    Right,
    Auto
};
const GetAttachPosition = (() => {
    const mirrorDiv = document.createElement('div');
    const markerSpan = document.createElement('span');

    mirrorDiv.style.position = 'absolute';
    mirrorDiv.style.visibility = 'hidden';
    mirrorDiv.style.whiteSpace = 'pre-wrap';
    mirrorDiv.style.wordWrap = 'break-word';
    mirrorDiv.style.top = '0';
    mirrorDiv.style.left = '0';
    mirrorDiv.style.pointerEvents = 'none';

    let lastTextarea: HTMLTextAreaElement | null = null;
    let lastStyle = '';

    const properties = [
        'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
        'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
        'letterSpacing', 'whiteSpace', 'wordBreak', 'overflowWrap',
        'textAlign', 'direction'
    ];

    return function(textarea: HTMLTextAreaElement): [number, number] {
        const selectionStart = textarea.selectionStart ?? 0;

        const currentStyle = window.getComputedStyle(textarea);
        const styleKey = properties.map(p => currentStyle.getPropertyValue(p)).join(';');

        if (lastTextarea !== textarea || lastStyle !== styleKey) {
            properties.forEach(prop => {
                mirrorDiv.style.setProperty(prop, currentStyle.getPropertyValue(prop));
            });
            lastStyle = styleKey;
            lastTextarea = textarea;
        }

        while (mirrorDiv.firstChild) mirrorDiv.removeChild(mirrorDiv.firstChild);

        const before = textarea.value.substring(0, selectionStart);
        const safeText = before.replace(/\n$/, '\n\u200b');

        const textNode = document.createTextNode(safeText);
        markerSpan.textContent = '\u200b';

        mirrorDiv.appendChild(textNode);
        mirrorDiv.appendChild(markerSpan); // ✨ 끝에만

        mirrorDiv.style.width = `${textarea.offsetWidth}px`;

        document.body.appendChild(mirrorDiv);

        const mirrorRect = mirrorDiv.getBoundingClientRect();
        const spanRect = markerSpan.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();

        const top = spanRect.top - mirrorRect.top;
        let left = spanRect.left - mirrorRect.left;

        document.body.removeChild(mirrorDiv);

        const lineHeight = parseFloat(currentStyle.getPropertyValue('line-height') || '16') || 16;
        //오른쪽으로 자꾸 밀려서 임시로 해결
        left*=0.8;
        return [
            Math.round(textareaRect.left + left),
            Math.round(textareaRect.top + top + lineHeight)
        ];
    };
})();



export class CTooltip extends CModal
{
    private static arrowStyleAdded : boolean = false;

    static eTrigger = eTrigger;
    static ePlacement = ePlacement;

    public mPopper : any;

    //inputs
    public mAttach : HTMLElement|[number, number];
    public mRefDummy : {m_original : [number, number], getBoundingClientRect : () => any};
    public mTrigger : eTrigger;
    public mPlacement : ePlacement;
    public mTheme : string;

    //event handler
    private mMouseOverHandler : EventListener | null = null;
    private mMouseLeaveHandler : EventListener | null = null;
    private mClickHandler : EventListener | null = null;
    private mBlurHandler : EventListener | null = null;

    constructor(
        _content : string|HTMLElement, 
        _attach : HTMLElement|[number, number], 
        _trigger : eTrigger=CTooltip.eTrigger.Hover, 
        _placement : ePlacement = ePlacement.Auto, 
        _theme : Bootstrap.eColor=Bootstrap.eColor.light
    ) {
        
        
        super(CUniqueID.Get());
        if(_attach==null)  return;
        if(CTooltip.IsPopper()==false) return;
        CTooltip.AddArrowStyle();

        this.mTrigger = _trigger;
        this.mPlacement = _placement;
        this.mTheme = _theme;
        this.mAttach = _attach;

        //this.CreateTooltipElement(_content, _theme);
        this.SetTitle(CModal.eTitle.None);
        this.SetBody(`
            <div class="bg-"${_theme} id=${"Content_" + this.mKey}></div>
        `);
        this.SetZIndex(CModal.eSort.Top);
        this.SetResize(false);
        this.Open();
        this.Hide(0);

        if (typeof _content === "string") {
            CUtil.ID("Content_" + this.mKey).textContent = _content;
        }
        else {
            CUtil.ID("Content_" + this.mKey).appendChild(_content);
        }
        const target = this.SetupAttachPos(_attach);

        if (this.mAttach instanceof HTMLElement)
        {
            if (this.mTrigger === eTrigger.Hover) 
            {
                this.mMouseOverHandler = () => this.Show();
                this.mMouseLeaveHandler = () => this.Hide();
                
                this.mAttach.addEventListener("mouseover", this.mMouseOverHandler);
                this.mAttach.addEventListener("mouseleave", this.mMouseLeaveHandler);
            } 
            else if (this.mTrigger === eTrigger.Click) 
            {
                this.mClickHandler = () => this.Show();
                this.mBlurHandler = () => this.Hide();
                
                this.mAttach.addEventListener("click", this.mClickHandler);
                this.mAttach.addEventListener("blur", this.mBlurHandler);
            }

            const observer = new MutationObserver((mutationsList) => 
            {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && !document.body.contains(this.mAttach as HTMLElement)) {
                        this.Destroy();
                        observer.disconnect();
                        break;
                    }
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        this.mPopper = window["Popper"].createPopper(target, this.mCard, {
            placement: CTooltip.GetPlacementString(this.mPlacement),
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset: [0, 8]
                    }
                },
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: []
                    }
                },
                {
                    name: "computeStyles",
                    options: {
                        gpuAcceleration: false
                    }
                }
            ]
        });
    }

    public Update(_delay: any): void {
        if(this.mRefDummy && this.mAttach instanceof HTMLTextAreaElement) {
            let pos = GetAttachPosition(this.mAttach);
            if(this.mRefDummy.m_original[0] != pos[0] || this.mRefDummy.m_original[1] != pos[1]) {
                this.mRefDummy.m_original[0] = pos[0];
                this.mRefDummy.m_original[1] = pos[1];
                this.Position();
            }
        }
    }

    public SetMaxWidth(_width : number) {
        if(this.mBody) {
            this.mBody.style.maxWidth = _width + "px";
        }
    }

    public SetMaxHeight(_height : number) {
        if(this.mBody) {
            this.mBody.style.maxHeight = _height + "px";
        }
    }

    //hover, click은 document에서 element가 사라지면 자동으로 삭제되도록 함
    public Destroy() {
        if(this.mPopper) {
            this.mPopper.destroy();
            this.mPopper = null;
        }

        this.RemoveEventListeners();
        this.Close();
    }

    public Position() {
        if(this.mPopper) {
            this.mPopper.update();
        }
    }
    public static IsPopper() 
    {
        return window["Popper"] != null;
    }
    public Show() {
        super.Show();
        if(this.mPopper) {
            if(this.mRefDummy && this.mAttach instanceof HTMLTextAreaElement) {
                let pos = GetAttachPosition(this.mAttach);
                this.mRefDummy.m_original[0] = pos[0];
                this.mRefDummy.m_original[1] = pos[1];
            }
            this.mPopper.update();
        }
    }

    public Hide(_animationTime : number = 300) {
        super.Hide(_animationTime);
        if(!(this.mAttach instanceof HTMLElement)) {
            this.Destroy();
        }
    }
    static AddArrowStyle(): void {
        if (!CTooltip.arrowStyleAdded) {
            CTooltip.arrowStyleAdded = true;
            const style = document.createElement('style');
            style.textContent = `
                #arrow {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: inherit;
                    transform: rotate(45deg);
                }

                #tooltip[data-popper-placement^='top'] > #arrow {
                    bottom: -4px;
                }
                #tooltip[data-popper-placement^='bottom'] > #arrow {
                    top: -4px;
                }
                #tooltip[data-popper-placement^='left'] > #arrow {
                    right: -4px;
                }
                #tooltip[data-popper-placement^='right'] > #arrow {
                    left: -4px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    private SetupAttachPos(_target: HTMLElement | [number, number]): any {
        if (_target instanceof HTMLElement) {
            if (_target instanceof HTMLTextAreaElement && getSelection().rangeCount != 0) {
                const pos = GetAttachPosition(_target);
                this.mRefDummy = {
                    m_original: [pos[0], pos[1]],
                    getBoundingClientRect() {
                        return {
                            top: this.m_original[1],
                            left: this.m_original[0],
                            bottom: this.m_original[1] + 1,
                            right: this.m_original[0] + 1,
                            width: 1,
                            height: 1,
                        };
                    }
                };
                this.SetPause(false);
                return this.mRefDummy;
            } else {
                return _target;
            }
        } else if (_target instanceof Array) {
            this.mRefDummy = {
                m_original: _target,
                getBoundingClientRect() {
                    return {
                        top: this.m_original[1],
                        left: this.m_original[0],
                        bottom: this.m_original[1] + 1,
                        right: this.m_original[0] + 1,
                        width: 1,
                        height: 1,
                    };
                }
            };
            this.SetPause(false);
            return this.mRefDummy;
        }
    }

    

   

    protected RemoveEventListeners(): void {
        if (!(this.mAttach instanceof HTMLElement)) return;

        if (this.mTrigger === eTrigger.Hover) {
            if (this.mMouseOverHandler) {
                this.mAttach.removeEventListener("mouseover", this.mMouseOverHandler);
                this.mMouseOverHandler = null;
            }
            if (this.mMouseLeaveHandler) {
                this.mAttach.removeEventListener("mouseleave", this.mMouseLeaveHandler);
                this.mMouseLeaveHandler = null;
            }
        } 
        else if (this.mTrigger === eTrigger.Click) {
            if (this.mClickHandler) {
                this.mAttach.removeEventListener("click", this.mClickHandler);
                this.mClickHandler = null;
            }
            if (this.mBlurHandler) {
                this.mAttach.removeEventListener("blur", this.mBlurHandler);
                this.mBlurHandler = null;
            }
        }
    }

    static GetPlacementString(placement: ePlacement): string {
        switch (placement) {
            case ePlacement.Top: return "top";
            case ePlacement.Bottom: return "bottom";
            case ePlacement.Left: return "left";
            case ePlacement.Right: return "right";
            case ePlacement.Auto:
            default: return "auto";
        }
    }
}
export class CTooltipList extends CTooltip
{
    //input
    public m_pair : [string, string][];
    public m_curIndex : number = -1;
    public m_selectToClose : boolean = true;
    public m_selectFunc : (_pair : [string, string]) => void;


    //Event handlers
    private m_keyUpHandler : EventListener | null = null;
    private m_keyDownHandler : EventListener | null = null;
    private m_isEscapeKeyDown = false;
    private m_isRightKeyDown = false;

    constructor(
        _pair : [string, string][], 
        _attach : HTMLTextAreaElement|HTMLInputElement, 
        _trigger : eTrigger=CTooltip.eTrigger.Hover, 
        _placemenet : ePlacement = ePlacement.Auto,
        _theme : Bootstrap.eColor=Bootstrap.eColor.light
    ) {
        let div = document.createElement("ul");
       

        super(div, _attach, _trigger, _placemenet, _theme);
        if(_attach==null)  return;
        if(CTooltip.IsPopper()==false) return;
        this.m_pair = _pair;
        this.UpdateContent();
        this.SetupKeyboardEvents();
    }

    public Hide(_animationTime : number = 300): void {
        super.Hide(_animationTime);
        this.m_curIndex = -1;

        const ulElement = CUtil.ID("Content_" + this.mKey).lastChild as HTMLUListElement;
        if(ulElement!=null)
        {
            const listItems = Array.from(ulElement.children);
            for(let item of listItems)
            {
                item.classList.remove("active");
            }
        }
        
    }

    public InitSelection(_closeAfterSelection : boolean, _selectFunc : (_pair : [string, string]) => void) {
        this.m_selectToClose = _closeAfterSelection;
        this.m_selectFunc = _selectFunc;
    }

    protected UpdateContent(_highlight : string = "") 
    {
       if(CTooltip.IsPopper()==false) return;

        let ulElement = CUtil.ID("Content_" + this.mKey).lastChild as HTMLUListElement;
        ulElement.innerHTML = "";
        ulElement.className = "list-group overflow-auto mw-100 mh-100";

        if(this.m_pair.length < this.m_curIndex + 1) {
            this.m_curIndex = 0;
        }

        if(this.m_pair.length == 0) {
            this.Hide(0);
            return;
        }
        else if(document.activeElement == this.mAttach)
            this.Show();

        for(let i = 0; i < this.m_pair.length; i++) {
            let [main, sub] = this.m_pair[i];
            this.CreateListItem(ulElement, main, sub, i, _highlight);
        }
    }

    private CreateListItem(
        _ulElement : HTMLUListElement,
        _main : string,
        _sub : string,
        _index : number,
        _highlight : string
    ) : void {
        const liElement = document.createElement("li");
        liElement.className = "list-group-item list-group-item-action list-group-item-" +this.mTheme;
        
        if (_index === this.m_curIndex) {
            liElement.className += " active";
        }
        
        _ulElement.appendChild(liElement);

        const containerDiv = document.createElement("div");
        containerDiv.className = "d-flex justify-content-between";
        liElement.appendChild(containerDiv);

        // Highlight matching text
        const regex = new RegExp(_highlight, 'gi');
        const text = _main.replace(regex, `<span style="color: red;">$&</span>`);

        const mainDiv = document.createElement("div");
        mainDiv.innerHTML = text;
        containerDiv.appendChild(mainDiv);

        if (_sub !== "") {
            const subDiv = document.createElement("small");
            subDiv.textContent = "(" + _sub + ")";
            containerDiv.appendChild(subDiv);
        }

        this.SetupListItemEvents(liElement, _ulElement, [_main, _sub], _index);
    }

    private SetupListItemEvents(
        _liElement : HTMLLIElement,
        _ulElement : HTMLUListElement,
        _pair : [string, string],
        _index : number
    ) : void {
        let canClick = true;
        
        _liElement.addEventListener("click", () => {
            if (this.mTrigger == CTooltip.eTrigger.Click && canClick) {
                this.Select(_pair);
                canClick = false;
            }
            
            // // Update active state
            // for (const child of _ulElement.children) {
            //     child.classList.remove("active");
            // }
            
            // this.m_curIndex = _index;
            // _liElement.classList.add("active");
            
            if (this.mAttach instanceof HTMLElement) {
                this.mAttach.focus();
            }
        });
        
        _liElement.addEventListener("dblclick", () => {
            if (this.mTrigger != CTooltip.eTrigger.Click) {
                this.Select(_pair);
            }
        });
    }

    private navigateList(moveUp: boolean): void {
        if(CTooltip.IsPopper()==false) return;

        const ulElement = CUtil.ID("Content_" + this.mKey).lastChild as HTMLUListElement;
        const listItems = Array.from(ulElement.children);
        
        // Remove active class from current item
        if (this.m_curIndex !== -1) {
            listItems[this.m_curIndex].classList.remove("active");
            this.m_curIndex = moveUp ? this.m_curIndex - 1 : this.m_curIndex + 1;
        } else {
            this.m_curIndex = 0;
        }
        
        // Handle wrap-around
        if (this.m_curIndex < 0) {
            this.m_curIndex += this.m_pair.length;
        } else if (this.m_curIndex >= this.m_pair.length) {
            this.m_curIndex -= this.m_pair.length;
        }
        
        // Add active class to new item
        listItems[this.m_curIndex].classList.add("active");
        listItems[this.m_curIndex].scrollIntoView({ block: "nearest" });
    }

    protected RemoveEventListeners(): void {
        super.RemoveEventListeners();
        
        if (!(this.mAttach instanceof HTMLElement)) return;
        
        if (this.m_keyUpHandler) {
            this.mAttach.removeEventListener("keyup", this.m_keyUpHandler);
            this.m_keyUpHandler = null;
        }
        
        if (this.m_keyDownHandler) {
            this.mAttach.removeEventListener("keydown", this.m_keyDownHandler);
            this.m_keyDownHandler = null;
        }
    }

    private SetupKeyboardEvents(): void {
        if (!(this.mAttach instanceof HTMLElement)) return;
        
        this.m_keyUpHandler = (e: KeyboardEvent) => {
            if (!this.mShow) return;
            
            const key = e.key;
            const isEnterOrEscape = key === 'Enter' || key === 'Escape' || key === 'ArrowRight';
            
            if (isEnterOrEscape) {
                e.preventDefault();
                e.stopPropagation();
            }

            if(key === 'ArrowRight' && this.m_isRightKeyDown) {
                if (this.m_curIndex !== -1) {
                    this.Select(this.m_pair[this.m_curIndex]);
                }
            }
            
            if (key === 'Escape' && this.m_isEscapeKeyDown) {
                this.Hide(0);
            }
            
            this.m_isEscapeKeyDown = false;
        };
        
        this.m_keyDownHandler = (e: KeyboardEvent) => {
            if (!this.mShow) return;
            
            const key = e.key;
            const isUpDownArrowKey = ['ArrowUp', 'ArrowDown'].includes(key);
            const isRightArrowKey = ['ArrowRight'].includes(key);
            const isEscapeKey = key === 'Escape';
            
            if (isUpDownArrowKey) {
                e.preventDefault();
                e.stopPropagation();
                this.navigateList(key === 'ArrowUp' || key === 'ArrowLeft');
            }

            if(isRightArrowKey) {
                e.preventDefault();
                e.stopPropagation();
                this.m_isRightKeyDown = true;
            }
            
            if (isEscapeKey) {
                e.preventDefault();
                e.stopPropagation();
                this.m_isEscapeKeyDown = true;
            }
        };
        
        this.mAttach.addEventListener("keyup", this.m_keyUpHandler);
        this.mAttach.addEventListener("keydown", this.m_keyDownHandler);
    }

    protected Select(_pair: [string, string]): void {
        if (!_pair) return;
        
        if (this.m_selectFunc) 
        {
            this.m_selectFunc(_pair);
        }
        else
        {
            if(this.mAttach instanceof HTMLInputElement)
            {
                this.mAttach.value=_pair[0];
            }
        }
        
        if (this.m_selectToClose) {
            this.Hide(0);

            
            
        }
    }
}

export class CTooltipListAuto extends CTooltipList
{
    private mOrgPair : [string, string][];
    private mTextStartIndex : number;
    private mTextEndIndex : number;
    private mDefaultSelectFunc : (_pair : [string, string]) => void;
    
    //Event Handlers
    //private m_clickHandler2 : EventListener | null = null;
    private mInputHandler : EventListener | null = null;
    private mPairsEvent : CEvent=null;
    constructor(
        _pair : [string, string][], 
        _attach : HTMLTextAreaElement|HTMLInputElement, 
        _trigger : eTrigger=CTooltip.eTrigger.Hover, 
        _placemenet : ePlacement = ePlacement.Auto,
        _theme : Bootstrap.eColor=Bootstrap.eColor.light
    ) 
    {
        super(_pair, _attach, _trigger, _placemenet, _theme);
        if(_attach==null)  return;
        if(CTooltip.IsPopper()==false) return;

        this.mOrgPair = _pair;
        this.FindCurrentWord();
        this.UpdateFilteredPairs();
        
        const textTarget = this.mAttach as HTMLTextAreaElement | HTMLInputElement;

        this.mInputHandler = () => {
            this.FindCurrentWord();
            this.UpdateFilteredPairs();
        };

        textTarget.addEventListener("input", this.mInputHandler);


        // this.m_selectToClose = true;
        this.mDefaultSelectFunc = (_pair) => {
            let textTarget = this.mAttach as HTMLTextAreaElement|HTMLInputElement;
            let before = textTarget.value.slice(0, this.mTextStartIndex);
            let selected = _pair[0];
            let after = textTarget.value.slice(this.mTextEndIndex);
                                
            //텍스트 전체 변환
            textTarget.value = before + selected + after;
            textTarget.selectionEnd = before.length + selected.length;

            textTarget.click();
        };
    }

    protected Select(_pair: [string, string]): void {
        if (!_pair) return;

        _pair[0] += ".";
        
        if (this.mDefaultSelectFunc) {
            this.mDefaultSelectFunc(_pair);
        }

        _pair[0] = _pair[0].substring(0, _pair[0].length - 1);
        
        super.Select(_pair);
    }

    public Destroy(): void {
        super.Destroy();
        this.RemoveTextInputEvents();
    }
    // SetPairsEvent(_event : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>) 
    // {
    //     this.mPairsEvent=CEvent.ToCEvent(_event);
    //     let event=()=>{
    //         this.mOrgPair=this.mPairsEvent.Call();
    //     };
       
    //     let html=this.mAttach as HTMLInputElement;
    //     html.addEventListener("mouseup", event);

    //     //📌 키보드 커서 이동 시
    //     html.addEventListener("keyup", (e) => {
    //         if (["ArrowRight"].includes(e.key)) {
    //             event();
    //         }
    //     });


    //     // 📌 입력 발생 시 (연산자/구분자 확인)
    //     html.addEventListener("input", () => {
            
    //         event(); // 자동완성 트리거 가능
            
    //     });
    //     html.addEventListener("blur", () => {
    //         this.Destroy();
    //     });
    // }
    
    public ResetPairs(_pairs : [string, string][]) {
        this.mOrgPair = _pairs;
        this.UpdateFilteredPairs();
    }

    private UpdateFilteredPairs(): void {
        if (!(this.mAttach instanceof HTMLElement)) return;

        const textTarget = this.mAttach as HTMLTextAreaElement | HTMLInputElement;
        const searchText = textTarget.value.substring(this.mTextStartIndex, this.mTextEndIndex).toLowerCase();
        
        
        
        // Filter pairs that match the search text
        const filteredPairs = this.mOrgPair.filter(pair => {
            const main = pair[0].toLowerCase();
            return main.includes(searchText);
        });
        
        this.m_pair = filteredPairs;
        this.UpdateContent(searchText);
    }


    private RemoveTextInputEvents(): void {
        const textTarget = this.mAttach as HTMLTextAreaElement | HTMLInputElement;
        
        // if (this.m_clickHandler2) {
        //     textTarget.removeEventListener("click", this.m_clickHandler2);
        //     this.m_clickHandler2 = null;
        // }
        
        if (this.mInputHandler) {
            textTarget.removeEventListener("input", this.mInputHandler);
            this.mInputHandler = null;
        }
    }

    private FindCurrentWord(): void {
        if (!CTooltip.IsPopper()) return;
        
        const target = this.mAttach as HTMLTextAreaElement | HTMLInputElement;
        const invalidChars = [" ", "\n", ";", ".", "=", "+", "-", "*", "/", ">", "<", "!", "^", "%", "]", "["];
        const selectionStart = target.selectionStart;
        
        // Find word start
        let startPos = selectionStart;
        while (startPos > 0 && !invalidChars.includes(target.value[startPos - 1])) {
            startPos--;
        }
        
        // Find word end
        let endPos = selectionStart;
        while (endPos < target.value.length && !invalidChars.includes(target.value[endPos])) {
            endPos++;
        }
        
        this.mTextStartIndex = startPos;
        this.mTextEndIndex = endPos;
    }
}