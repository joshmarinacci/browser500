import {BElement, BInsets, BNode, Box, BPoint, BRect, BSize, BText, ImageBox, ImageCache, LayoutBox, LineBox, RunBox, TextStyle} from "./common";
import {BStyleSet} from "./style";

function log(...args: any[]) {
    // console.log("LOG",...args)
}

const make_box_from_style = (element: BElement, styles: BStyleSet, size: BSize, position: BPoint):LayoutBox => {
    let style = styles.lookup_block_style(element.name)
    return new LayoutBox(element, position, size, style);
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

export function layout(element:BElement, styles:BStyleSet, canvas:HTMLCanvasElement, cache:ImageCache):LayoutBox {
    let canvas_size:BSize = new BSize(canvas.width, canvas.height)
    return box_box_layout(element, styles, canvas_size, new BPoint(0,0), canvas.getContext("2d"),cache)
}

function calculate_layout_type(element: BElement, styles:BStyleSet):"inline"|"block" {
    // if there are no block children then it's an inline context, otherwise it has to be block context
    let block_count = 0;
    element.children.forEach(ch => {
        if(ch.type === 'element') {
            let style = styles.lookup_block_style((ch as BElement).name)
            if(style.display !== 'inline') block_count++
        }
    })
    return (block_count === 0)?"inline":"block"
}

function image_layout(element: BElement, body_bounds: BRect, styles: BStyleSet, min: BPoint, ctx: CanvasRenderingContext2D, cache:ImageCache) {
    let style = styles.lookup_block_style(element.name)
    let src = element.atts['src']
    let size = new BSize(50,50)
    if(src) {
        // if loaded use real size
        if(cache.is_loaded(src)) {
            size = cache.getImageSize(src)
        } else {
            // if not loaded use 50,50 and start loading
            cache.load(src)
        }
    }
    // if atts set, use atts
    if(element.atts['width'] && element.atts['height']) {
        size = new BSize(styles.scale_prop(parseInt(element.atts['width'])),styles.scale_prop(parseInt(element.atts['height'])))
    }
    return new ImageBox(element, src, min, size, style)
}

function box_box_layout(element: BElement, styles: BStyleSet, canvas_size: BSize, position: BPoint, ctx: CanvasRenderingContext2D, cache:ImageCache):LayoutBox {
    let html_box:LayoutBox = make_box_from_style(element, styles, canvas_size, position)
    let inset = html_box.style.margin.add(html_box.style.border.thick).add(html_box.style.padding)
    let body_bounds:BRect = html_box.size.toRect().subtract_inset(inset)
    let lowest:BPoint = body_bounds.top_left()
    element.children.forEach((ch) => {
        let elem:BElement
        if(ch.type === 'element') {
            elem = ch as BElement
        }
        if(ch.type === 'text') {
            elem = new BElement('anonymous', {})
            elem.children.push(ch)
        }

        let style = styles.lookup_block_style(elem.name)
        let layout_context = calculate_layout_type(elem,styles)
        if(style.display === 'none') return
        if(style.display === "inline") return console.warn("not doing inline yet. :(")
        let box:Box
        if(elem.name === 'img') {
            box = image_layout(elem,body_bounds,styles,lowest,ctx, cache)
        } else {
            if (layout_context === 'inline') box = box_text_layout(elem, body_bounds, styles, lowest, ctx)
            if (layout_context === 'block') box = box_box_layout(elem, styles, body_bounds.size(), lowest, ctx, cache)
        }
        lowest = new BPoint(lowest.x, box.position.y + box.size.h)
        html_box.children.push(box)
    })
    html_box.size.h = lowest.y + inset.bottom
    return html_box
}

function box_text_layout(elem: BElement, bounds: BRect, styles: BStyleSet, min: BPoint, ctx: CanvasRenderingContext2D):LayoutBox {
    // log("box_text_layout",elem.name,min,elem)
    let body_box:LayoutBox = make_box_from_style(elem,styles,bounds.size(),min)
    let text_style:TextStyle = styles.lookup_text_style(body_box.element.name)
    let insets:BInsets = body_box.style.margin.add(body_box.style.border.thick).add(body_box.style.padding)
    let line_height = text_style["font-size"]*1.3
    let curr_w = 0
    let avail_w = bounds.w
    let lines:LineBox[] = []
    let current_line:LineBox = new LineBox(insets.top_left(), new BSize(0,20))
    elem.children.forEach((ch:BNode) => {
        let text = ""
        let text_style:TextStyle
        let owner:BElement = elem
        if(ch.type === 'element') {
            let elem = ch as BElement
            owner = elem
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
        let current_run:RunBox = new RunBox("",new BPoint(curr_w,0),text_style, owner)
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
                current_line = new LineBox(
                    new BPoint(insets.left, current_line.position.y + line_height),
                    new BSize(avail_w,20)
                )
                current_run = new RunBox(chunk, new BPoint(curr_w, 0), text_style, owner)
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
    if(body_box.style['text-align'] !== 'left') {
        lines.forEach(line => {
            let nx = 0
            if(body_box.style['text-align'] === 'right') nx = avail_w - line.size.w
            if(body_box.style['text-align'] === 'center') nx = (avail_w - line.size.w)/2
            line.position = new BPoint(nx,line.position.y)
        })
    }
    body_box.children = lines
    body_box.size = new BSize(body_box.size.w,current_line.position.y + line_height + insets.bottom);
    return body_box
}
