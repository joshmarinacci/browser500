import {
    BElement,
    BInsets,
    BNode,
    BPoint,
    BRect,
    BSize,
    BStyleSet,
    BText,
    LayoutBox,
    LineBox,
    TextStyle
} from "./common";
// sub-line box spans with colored text
// noinspection JSUnusedLocalSymbols


function log(...args: any[]) {
    console.log("LOG",...args)
}

const make_box_from_style = (element: BElement, styles: BStyleSet, size: BSize, position: BPoint):LayoutBox => {
    let style = styles.lookup_block_style(element.name)
    return { type:"box", position, size, element, children:[], style }
}

type ItRes = {
    value: any,
    done: boolean,
}

class WhitespaceIterator {
    n: number
    private text: string;
    private done: boolean;

    constructor(text: string) {
        this.n = 0;
        this.text = text;
        this.done = false
    }

    next(): ItRes {
        if (this.done) return {value: null, done: true}
        let chunk = ""
        while (true) {
            let ch = this.text[this.n]
            this.n++
            if (this.n > this.text.length) {
                this.done = true
                return {
                    value: chunk,
                    done: false
                }
            }
            if (ch === ' ') {
                return {
                    value: chunk,
                    done: false
                }
            } else {
                chunk += ch
            }
        }
    }

}

// dom tree + css tree -> layout tree
export function layout(element:BElement, styles:BStyleSet, canvas:HTMLCanvasElement):LayoutBox {
    log("doing layout",element)
    let canvas_size:BSize = new BSize(canvas.width, canvas.height)
    let ctx:CanvasRenderingContext2D = canvas.getContext("2d");
    return box_box_layout(element, styles, canvas_size, new BPoint(0,0), ctx)
}

function box_box_layout(element: BElement, styles: BStyleSet, canvas_size: BSize, position: BPoint, ctx: CanvasRenderingContext2D):LayoutBox {
    log("layout of",element.name,'at',position)
    let html_box:LayoutBox = make_box_from_style(element, styles, canvas_size, position)
    let inset = html_box.style.margin.add(html_box.style.border.thick).add(html_box.style.padding)
    let body_bounds:BRect = html_box.size.toRect().subtract_inset(inset)
    let lowest:BPoint = body_bounds.top_left()
    element.children.forEach((ch) => {
        if(ch.type === 'element') {
            let elem = ch as BElement
            if(elem.name === 'body') {
                let box  = box_text_layout(elem, body_bounds, styles, lowest, ctx)
                lowest = new BPoint(lowest.x,box.position.y+box.size.h)
                html_box.children.push(box)
            }
            if(elem.name === 'p') {
                let box = box_text_layout(elem,body_bounds, styles,lowest, ctx)
                lowest = new BPoint(lowest.x,box.position.y+box.size.h)
                html_box.children.push(box)
            }
            if(elem.name === 'style') {
                log("skipping 'style'")
            }
        }
    })
    return html_box
}

function make_line_box(text:string, size:BSize, position:BPoint, style:TextStyle):LineBox {
    return { type: "line", text, position, size, style, }
}
function box_text_layout(elem: BElement, bounds: BRect, styles: BStyleSet, min: BPoint, ctx: CanvasRenderingContext2D):LayoutBox {
    log("box_text_layout",elem.name,min,elem)
    let body_box:LayoutBox = make_box_from_style(elem,styles,bounds.size(),min)
    //get the text children as strings
    let text_lines:string[] = elem.children.map((ch:BNode) => ((ch as BText).text))
    let text_style:TextStyle = styles.lookup_text_style(body_box.element.name)
    let insets:BInsets = body_box.style.margin.add(body_box.style.border.thick).add(body_box.style.padding)
    let line_height = text_style.fontSize*1.3
    let curr_text = ""
    let curr_pos = insets.top_left()
    let curr_w = 0
    let avail_w = bounds.w
    let lines:LineBox[] = []
    text_lines.forEach(text => {
        let chunks = new WhitespaceIterator(text)
        let res = chunks.next()
        while (res.done === false) {
            let m = ctx.measureText(res.value)
            if(curr_pos.x + curr_w + m.width < avail_w) {
                curr_text += ' ' + res.value
                curr_w += m.width + ctx.measureText(' ').width
            } else {
                let size:BSize = new BSize(curr_w, line_height)
                lines.push(make_line_box(curr_text, size, curr_pos, text_style))
                curr_text = res.value
                curr_w = m.width
                curr_pos = new BPoint(insets.left,curr_pos.y+line_height)
            }
            res = chunks.next()
        }
        //handle the last line
        if(curr_w > 0) {
            let size:BSize = new BSize(curr_w, line_height)
            lines.push(make_line_box(curr_text, size, curr_pos, text_style))
            curr_text = ""
            curr_pos = new BPoint(curr_w, curr_pos.y)
            curr_w = 0
        }
    })
    log('bottom of',elem.name,curr_pos)
    body_box.children = lines
    body_box.size = new BSize(body_box.size.w,curr_pos.y + line_height + insets.bottom);
    return body_box
}

// map mouse input -> layout tree
export function pickNode(_cursor:BPoint, _root:LayoutBox):LayoutBox[] {
    return []
}

// map layout tree -> dom tree
export function getDom(_box:LayoutBox):BNode {
    return {
        type:"text",
        text:"hi"
    }
}
// rollover for hover elements
// click for link
