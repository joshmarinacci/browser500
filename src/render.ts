import {BColor, BElement, BPoint, BRect, ImageBox, ImageCache, LayoutBox, LineBox} from "./common";

function log(...args: any[]) {
    // console.log("LOG",...args)
}

const DEBUG = {
    BLOCK: {
        PADDING: false,
    },
    TEXT: {
        LINES: false,
        RUNS:   false,
    }
}

// layout tree to canvas
export function render(root: LayoutBox, canvas: HTMLCanvasElement, scroll_offset: BPoint, cache: ImageCache): void {
    let ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.save()
    if(canvas.height - scroll_offset.y > root.bounds().h) scroll_offset = new BPoint(0,-root.bounds().h + canvas.height)
    ctx.translate(scroll_offset.x,scroll_offset.y)
    draw_box(ctx, root,cache)
    ctx.restore()
}

function draw_image(c: CanvasRenderingContext2D, box: ImageBox, cache: ImageCache) {
    fill_rect(c,box.bounds(),box.style["background-color"])
    if(cache.is_loaded(box.src)) {
        cache.draw_image(c,box.bounds(),box.src)
    }
}

function draw_box(c: CanvasRenderingContext2D, root: LayoutBox, cache: ImageCache): void {
    c.save()
    translate(c, root.position)
    let insets = root.style.margin.add(root.style.border.thick)
    let rect = root.size.toRect().subtract_inset(insets)
    //draw background
    fill_rect(c, rect, root.style["background-color"])
    //draw border
    stroke_rect(c, rect, root.style.border.thick.top, root.style.border.color)
    //draw children
    root.children.forEach((ch) => {
        if (ch.type === 'box') draw_box(c, ch as LayoutBox, cache)
        if (ch.type === 'line') draw_line(c, ch as LineBox)
        if (ch.type === 'image') draw_image(c, ch as ImageBox, cache)
    })
    if (root.style.display === "list-item") {
        fill_text(c, "\u2022", rect.middle_left().add(new BPoint(0,5)), "black")
    }
    if (DEBUG.BLOCK.PADDING) {
        stroke_rect(c, root.size.toRect().subtract_inset(root.style.margin.add(root.style.border.thick).add(root.style.padding)), 2, 'red')
    }
    c.restore()
}

function draw_line(c: CanvasRenderingContext2D, line: LineBox) {
    line.runs.forEach(run => {
        run.set_style(c)
        let pos = line.position.add(run.position)
        fill_text(c,run.text,pos.add(new BPoint(0,run.style['font-size'])),run.style.color)
        if(run.style["text-decoration"] === 'underline') {
            let underline = new BRect(run.position.x,run.position.y+run.size.h, run.size.w, 1);
            stroke_rect(c,underline.translate(line.position),1,run.style.color)
        }
        if(DEBUG.TEXT.RUNS) stroke_rect(c,run.bounds().translate(line.position),1,'red');
    })
    if (DEBUG.TEXT.LINES) {
        c.strokeStyle = 'black'
        c.lineWidth = 1;
        c.strokeRect(line.position.x + 0.5, line.position.y + 0.5, line.size.w, line.size.h)
    }
}

function translate(c: CanvasRenderingContext2D, position: BPoint) {
    c.translate(position.x, position.y)
}

function stroke_rect(c: CanvasRenderingContext2D, rect: BRect, thick: number, color: BColor): void {
    if(thick < 1) return
    c.lineWidth = thick
    c.strokeStyle = color
    c.strokeRect(rect.x, rect.y, rect.w, rect.h)
}
function fill_text(c: CanvasRenderingContext2D, x: string, bPoint: BPoint, black: string) {
    c.fillStyle = black
    c.fillText(x,bPoint.x,bPoint.y)
}

function fill_rect(c: CanvasRenderingContext2D, rect: BRect, color: BColor): void {
    c.fillStyle = color
    c.fillRect(rect.x, rect.y, rect.w, rect.h)
}
export function find_element(layout_tree:LayoutBox, pt:BPoint):BElement|undefined {
    // console.log("looking at",pt,layout_tree.element.name)
    for (let box of layout_tree.children) {
        if(box.bounds().contains(pt)) {
            if (box.type === "box") {
                return find_element(box as LayoutBox,pt.subtract(box.position))
            }
            if(box.type === "line") {
                let line = box as LineBox
                for(let run of line.runs) {
                    if(run.bounds().contains(pt.subtract(line.position))) {
                        return run.element
                    }
                }
            }
        }
    }
    return layout_tree.element
}
