import { Bootstrap } from "../basic/Bootstrap.js";
import { CModal } from "../basic/CModal.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
var eTrigger;
(function (eTrigger) {
    eTrigger[eTrigger["Hover"] = 0] = "Hover";
    eTrigger[eTrigger["Click"] = 1] = "Click";
    eTrigger[eTrigger["Manual"] = 2] = "Manual";
})(eTrigger || (eTrigger = {}));
;
var ePlacement;
(function (ePlacement) {
    ePlacement[ePlacement["Top"] = 0] = "Top";
    ePlacement[ePlacement["Bottom"] = 1] = "Bottom";
    ePlacement[ePlacement["Left"] = 2] = "Left";
    ePlacement[ePlacement["Right"] = 3] = "Right";
    ePlacement[ePlacement["Auto"] = 4] = "Auto";
})(ePlacement || (ePlacement = {}));
;
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
    let lastTextarea = null;
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
    return function (textarea) {
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
        while (mirrorDiv.firstChild)
            mirrorDiv.removeChild(mirrorDiv.firstChild);
        const before = textarea.value.substring(0, selectionStart);
        const safeText = before.replace(/\n$/, '\n\u200b');
        const textNode = document.createTextNode(safeText);
        markerSpan.textContent = '\u200b';
        mirrorDiv.appendChild(textNode);
        mirrorDiv.appendChild(markerSpan);
        mirrorDiv.style.width = `${textarea.offsetWidth}px`;
        document.body.appendChild(mirrorDiv);
        const mirrorRect = mirrorDiv.getBoundingClientRect();
        const spanRect = markerSpan.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        const top = spanRect.top - mirrorRect.top;
        let left = spanRect.left - mirrorRect.left;
        document.body.removeChild(mirrorDiv);
        const lineHeight = parseFloat(currentStyle.getPropertyValue('line-height') || '16') || 16;
        left *= 0.8;
        return [
            Math.round(textareaRect.left + left),
            Math.round(textareaRect.top + top + lineHeight)
        ];
    };
})();
export class CTooltip extends CModal {
    static arrowStyleAdded = false;
    static eTrigger = eTrigger;
    static ePlacement = ePlacement;
    mPopper;
    mAttach;
    mRefDummy;
    mTrigger;
    mPlacement;
    mTheme;
    mMouseOverHandler = null;
    mMouseLeaveHandler = null;
    mClickHandler = null;
    mBlurHandler = null;
    constructor(_content, _attach, _trigger = CTooltip.eTrigger.Hover, _placement = ePlacement.Auto, _bg = Bootstrap.eColor.light) {
        super(CUniqueID.Get());
        if (_attach == null)
            return;
        if (CTooltip.IsPopper() == false)
            return;
        CTooltip.AddArrowStyle();
        this.mTrigger = _trigger;
        this.mPlacement = _placement;
        this.mAttach = _attach;
        this.SetTitle(CModal.eTitle.None);
        this.SetBody(`
            <div  id="Content_${this.mKey}"></div>
        `);
        this.SetBG(_bg);
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
        if (this.mAttach instanceof HTMLElement) {
            if (this.mTrigger === eTrigger.Hover) {
                this.mMouseOverHandler = () => this.Show();
                this.mMouseLeaveHandler = () => this.Hide();
                this.mAttach.addEventListener("mouseover", this.mMouseOverHandler);
                this.mAttach.addEventListener("mouseleave", this.mMouseLeaveHandler);
            }
            else if (this.mTrigger === eTrigger.Click) {
                this.mClickHandler = () => this.Show();
                this.mBlurHandler = () => this.Hide();
                this.mAttach.addEventListener("click", this.mClickHandler);
                this.mAttach.addEventListener("blur", this.mBlurHandler);
            }
            const observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && !document.body.contains(this.mAttach)) {
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
    Update(_delay) {
        if (this.mRefDummy && this.mAttach instanceof HTMLTextAreaElement) {
            let pos = GetAttachPosition(this.mAttach);
            if (this.mRefDummy.m_original[0] != pos[0] || this.mRefDummy.m_original[1] != pos[1]) {
                this.mRefDummy.m_original[0] = pos[0];
                this.mRefDummy.m_original[1] = pos[1];
                this.Position();
            }
        }
    }
    SetMaxWidth(_width) {
        if (this.mBody) {
            this.mBody.style.maxWidth = _width + "px";
        }
    }
    SetMaxHeight(_height) {
        if (this.mBody) {
            this.mBody.style.maxHeight = _height + "px";
        }
    }
    Destroy() {
        if (this.mPopper) {
            this.mPopper.destroy();
            this.mPopper = null;
        }
        this.RemoveEventListeners();
        this.Close();
    }
    Position() {
        if (this.mPopper) {
            this.mPopper.update();
        }
    }
    static IsPopper() {
        return window["Popper"] != null;
    }
    Show() {
        super.Show();
        if (this.mPopper) {
            if (this.mRefDummy && this.mAttach instanceof HTMLTextAreaElement) {
                let pos = GetAttachPosition(this.mAttach);
                this.mRefDummy.m_original[0] = pos[0];
                this.mRefDummy.m_original[1] = pos[1];
            }
            this.mPopper.update();
        }
    }
    Hide(_animationTime = 300) {
        super.Hide(_animationTime);
        if (!(this.mAttach instanceof HTMLElement)) {
            this.Destroy();
        }
    }
    static AddArrowStyle() {
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
    SetupAttachPos(_target) {
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
            }
            else {
                return _target;
            }
        }
        else if (_target instanceof Array) {
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
    RemoveEventListeners() {
        if (!(this.mAttach instanceof HTMLElement))
            return;
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
    static GetPlacementString(placement) {
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
export class CTooltipList extends CTooltip {
    m_pair;
    m_curIndex = -1;
    m_selectToClose = true;
    m_selectFunc;
    m_keyUpHandler = null;
    m_keyDownHandler = null;
    m_isEscapeKeyDown = false;
    m_isRightKeyDown = false;
    constructor(_pair, _attach, _trigger = CTooltip.eTrigger.Hover, _placemenet = ePlacement.Auto, _theme = Bootstrap.eColor.light) {
        let div = document.createElement("ul");
        super(div, _attach, _trigger, _placemenet, _theme);
        if (_attach == null)
            return;
        if (CTooltip.IsPopper() == false)
            return;
        this.m_pair = _pair;
        this.UpdateContent();
        this.SetupKeyboardEvents();
    }
    Hide(_animationTime = 300) {
        super.Hide(_animationTime);
        this.m_curIndex = -1;
        const ulElement = CUtil.ID("Content_" + this.mKey).lastChild;
        if (ulElement != null) {
            const listItems = Array.from(ulElement.children);
            for (let item of listItems) {
                item.classList.remove("active");
            }
        }
    }
    InitSelection(_closeAfterSelection, _selectFunc) {
        this.m_selectToClose = _closeAfterSelection;
        this.m_selectFunc = _selectFunc;
    }
    UpdateContent(_highlight = "") {
        if (CTooltip.IsPopper() == false)
            return;
        let ulElement = CUtil.ID("Content_" + this.mKey).lastChild;
        ulElement.innerHTML = "";
        ulElement.className = "list-group overflow-auto mw-100 mh-100";
        if (this.m_pair.length < this.m_curIndex + 1) {
            this.m_curIndex = 0;
        }
        if (this.m_pair.length == 0) {
            this.Hide(0);
            return;
        }
        else if (document.activeElement == this.mAttach)
            this.Show();
        for (let i = 0; i < this.m_pair.length; i++) {
            let [main, sub] = this.m_pair[i];
            this.CreateListItem(ulElement, main, sub, i, _highlight);
        }
    }
    CreateListItem(_ulElement, _main, _sub, _index, _highlight) {
        const liElement = document.createElement("li");
        liElement.className = "list-group-item list-group-item-action list-group-item-" + this.mTheme;
        if (_index === this.m_curIndex) {
            liElement.className += " active";
        }
        _ulElement.appendChild(liElement);
        const containerDiv = document.createElement("div");
        containerDiv.className = "d-flex justify-content-between";
        liElement.appendChild(containerDiv);
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
    SetupListItemEvents(_liElement, _ulElement, _pair, _index) {
        let canClick = true;
        _liElement.addEventListener("click", () => {
            if (this.mTrigger == CTooltip.eTrigger.Click && canClick) {
                this.Select(_pair);
                canClick = false;
            }
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
    navigateList(moveUp) {
        if (CTooltip.IsPopper() == false)
            return;
        const ulElement = CUtil.ID("Content_" + this.mKey).lastChild;
        const listItems = Array.from(ulElement.children);
        if (this.m_curIndex !== -1) {
            listItems[this.m_curIndex].classList.remove("active");
            this.m_curIndex = moveUp ? this.m_curIndex - 1 : this.m_curIndex + 1;
        }
        else {
            this.m_curIndex = 0;
        }
        if (this.m_curIndex < 0) {
            this.m_curIndex += this.m_pair.length;
        }
        else if (this.m_curIndex >= this.m_pair.length) {
            this.m_curIndex -= this.m_pair.length;
        }
        listItems[this.m_curIndex].classList.add("active");
        listItems[this.m_curIndex].scrollIntoView({ block: "nearest" });
    }
    RemoveEventListeners() {
        super.RemoveEventListeners();
        if (!(this.mAttach instanceof HTMLElement))
            return;
        if (this.m_keyUpHandler) {
            this.mAttach.removeEventListener("keyup", this.m_keyUpHandler);
            this.m_keyUpHandler = null;
        }
        if (this.m_keyDownHandler) {
            this.mAttach.removeEventListener("keydown", this.m_keyDownHandler);
            this.m_keyDownHandler = null;
        }
    }
    SetupKeyboardEvents() {
        if (!(this.mAttach instanceof HTMLElement))
            return;
        this.m_keyUpHandler = (e) => {
            if (!this.mShow)
                return;
            const key = e.key;
            const isEnterOrEscape = key === 'Enter' || key === 'Escape' || key === 'ArrowRight';
            if (isEnterOrEscape) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (key === 'ArrowRight' && this.m_isRightKeyDown) {
                if (this.m_curIndex !== -1) {
                    this.Select(this.m_pair[this.m_curIndex]);
                }
            }
            if (key === 'Escape' && this.m_isEscapeKeyDown) {
                this.Hide(0);
            }
            this.m_isEscapeKeyDown = false;
        };
        this.m_keyDownHandler = (e) => {
            if (!this.mShow)
                return;
            const key = e.key;
            const isUpDownArrowKey = ['ArrowUp', 'ArrowDown'].includes(key);
            const isRightArrowKey = ['ArrowRight'].includes(key);
            const isEscapeKey = key === 'Escape';
            if (isUpDownArrowKey) {
                e.preventDefault();
                e.stopPropagation();
                this.navigateList(key === 'ArrowUp' || key === 'ArrowLeft');
            }
            if (isRightArrowKey) {
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
    Select(_pair) {
        if (!_pair)
            return;
        if (this.m_selectFunc) {
            this.m_selectFunc(_pair);
        }
        else {
            if (this.mAttach instanceof HTMLInputElement) {
                this.mAttach.value = _pair[0];
            }
        }
        if (this.m_selectToClose) {
            this.Hide(0);
        }
    }
}
export class CTooltipListAuto extends CTooltipList {
    mOrgPair;
    mTextStartIndex;
    mTextEndIndex;
    mDefaultSelectFunc;
    mInputHandler = null;
    mPairsEvent = null;
    constructor(_pair, _attach, _trigger = CTooltip.eTrigger.Hover, _placemenet = ePlacement.Auto, _theme = Bootstrap.eColor.light) {
        super(_pair, _attach, _trigger, _placemenet, _theme);
        if (_attach == null)
            return;
        if (CTooltip.IsPopper() == false)
            return;
        this.mOrgPair = _pair;
        this.FindCurrentWord();
        this.UpdateFilteredPairs();
        const textTarget = this.mAttach;
        this.mInputHandler = () => {
            this.FindCurrentWord();
            this.UpdateFilteredPairs();
        };
        textTarget.addEventListener("input", this.mInputHandler);
        this.mDefaultSelectFunc = (_pair) => {
            let textTarget = this.mAttach;
            let before = textTarget.value.slice(0, this.mTextStartIndex);
            let selected = _pair[0];
            let after = textTarget.value.slice(this.mTextEndIndex);
            textTarget.value = before + selected + after;
            textTarget.selectionEnd = before.length + selected.length;
            textTarget.click();
        };
    }
    Select(_pair) {
        if (!_pair)
            return;
        _pair[0] += ".";
        if (this.mDefaultSelectFunc) {
            this.mDefaultSelectFunc(_pair);
        }
        _pair[0] = _pair[0].substring(0, _pair[0].length - 1);
        super.Select(_pair);
    }
    Destroy() {
        super.Destroy();
        this.RemoveTextInputEvents();
    }
    ResetPairs(_pairs) {
        this.mOrgPair = _pairs;
        this.UpdateFilteredPairs();
    }
    UpdateFilteredPairs() {
        if (!(this.mAttach instanceof HTMLElement))
            return;
        const textTarget = this.mAttach;
        const searchText = textTarget.value.substring(this.mTextStartIndex, this.mTextEndIndex).toLowerCase();
        const filteredPairs = this.mOrgPair.filter(pair => {
            const main = pair[0].toLowerCase();
            return main.includes(searchText);
        });
        this.m_pair = filteredPairs;
        this.UpdateContent(searchText);
    }
    RemoveTextInputEvents() {
        const textTarget = this.mAttach;
        if (this.mInputHandler) {
            textTarget.removeEventListener("input", this.mInputHandler);
            this.mInputHandler = null;
        }
    }
    FindCurrentWord() {
        if (!CTooltip.IsPopper())
            return;
        const target = this.mAttach;
        const invalidChars = [" ", "\n", ";", ".", "=", "+", "-", "*", "/", ">", "<", "!", "^", "%", "]", "["];
        const selectionStart = target.selectionStart;
        let startPos = selectionStart;
        while (startPos > 0 && !invalidChars.includes(target.value[startPos - 1])) {
            startPos--;
        }
        let endPos = selectionStart;
        while (endPos < target.value.length && !invalidChars.includes(target.value[endPos])) {
            endPos++;
        }
        this.mTextStartIndex = startPos;
        this.mTextEndIndex = endPos;
    }
}
