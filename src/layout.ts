import {
    BElement,
    BInsets,
    BNode,
    BPoint,
    BRect,
    BSize,
    BText,
    LayoutBox,
    LineBox,
    RunBox,
    TextStyle
} from "./common";
import {BStyleSet} from "./style";
// sub-line box spans with colored text

function log(...args: any[]) {
    // console.log("LOG",...args)
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
            let style = styles.lookup_block_style(elem.name)
            if(style.display === 'none') return
            if(style.display === "inline") return log("not doing inline yet. :(")
            if(elem.name === 'p' || style.display === 'list-item') {
                let box = box_text_layout(elem,body_bounds, styles,lowest, ctx)
                lowest = new BPoint(lowest.x,box.position.y+box.size.h)
                html_box.children.push(box)
                return
            }
            if(style.display === "block") {
                log("doing block ",elem.name)
                let box = box_box_layout(elem,styles,body_bounds.size(),lowest,ctx)
                lowest = new BPoint(lowest.x,box.position.y+box.size.h)
                html_box.children.push(box)
                return
            }
            console.warn("didn't do element",elem.name, style.display)
        } else {
            console.warn(`element had an inline child `,ch)
        }
    })
    html_box.size.h = lowest.y + inset.bottom
    return html_box
}

function box_text_layout(elem: BElement, bounds: BRect, styles: BStyleSet, min: BPoint, ctx: CanvasRenderingContext2D):LayoutBox {
    log("box_text_layout",elem.name,min,elem)
    let body_box:LayoutBox = make_box_from_style(elem,styles,bounds.size(),min)
    let text_style:TextStyle = styles.lookup_text_style(body_box.element.name)
    let insets:BInsets = body_box.style.margin.add(body_box.style.border.thick).add(body_box.style.padding)
    let line_height = text_style["font-size"]*1.3
    let curr_w = 0
    let avail_w = bounds.w
    let lines:LineBox[] = []
    let current_line:LineBox = {
        type: "line",
        position: insets.top_left(),
        runs: [],
        size: new BSize(0,20),
    }
    elem.children.forEach((ch:BNode) => {
        let text = ""
        let text_style:TextStyle
        if(ch.type === 'element') {
            let elem = ch as BElement
            let tch = elem.children[0] as BText
            text_style = styles.lookup_text_style(elem.name)
            text = tch.text
        }
        if(ch.type === 'text') {
            text_style = styles.lookup_text_style(elem.name)
            text = ch.text
        }
        // log(`input text "${text}"`)
        // log("text style",text_style)
        let current_run:RunBox = new RunBox("",new BPoint(curr_w,0),text_style)
        let chunks = new WhitespaceIterator(text)
        while (true) {
            let res = chunks.next()
            if(res.done) break;
            let chunk = res.value.trim()
            if(chunk === '') continue;
            current_run.set_style(ctx)
            let chunk_size = ctx.measureText(chunk)
            if (current_line.position.x + curr_w + chunk_size.width < avail_w) {
                current_run.text  += ' ' + chunk
                curr_w += chunk_size.width + ctx.measureText(' ').width
            } else {
                // log("wrapping")
                current_line.size = new BSize(curr_w, line_height)
                current_run.size = new BSize(curr_w - current_run.position.x ,line_height)
                // log("ADDING RUN",current_run.text,current_run.position)
                current_line.runs.push(current_run)
                lines.push(current_line)
                curr_w = chunk_size.width
                curr_w = 0
                current_line = {
                    type:'line',
                    position: new BPoint(insets.left, current_line.position.y + line_height),
                    runs:[],
                    size: new BSize(avail_w,20)
                }
                current_run = new RunBox(chunk,new BPoint(curr_w,0),text_style)
            }
        }
        // log(`leftover text "${current_run.text}"`)
        // current_run.text = curr_text
        current_run.size = new BSize(curr_w - current_run.position.x ,line_height)
        // log("ADDING RUN",current_run.text,current_run.position)
        current_line.runs.push(current_run)
    })
    //handle the last line
    if(curr_w > 0) {
        current_line.size = new BSize(curr_w, line_height)
        lines.push(current_line)
        curr_w = 0
    }
    // log('bottom of',elem.name,current_line.position)
    body_box.children = lines
    body_box.size = new BSize(body_box.size.w,current_line.position.y + line_height + insets.bottom);
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
