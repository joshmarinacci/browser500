import {BColor, BPoint, BRect, BSize, LayoutBox, LineBox} from "./common";

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
export function render(root: LayoutBox, canvas: HTMLCanvasElement): void {
    draw_box(canvas.getContext('2d') as CanvasRenderingContext2D, root)
}

function draw_box(c: CanvasRenderingContext2D, root: LayoutBox): void {
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
        if (ch.type === 'box') draw_box(c, ch as LayoutBox)
        if (ch.type === 'line') draw_line(c, ch as LineBox)
    })
    if (root.style.display === "list-item") {
        let bullet = BRect.fromPosSiz(rect.middle_left().add(new BPoint(-3,0)),new BSize(5,5))
        fill_rect(c,bullet,root.style.border.color)
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
        c.fillText(run.text,pos.x,pos.y + run.style["font-size"])
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

function fill_rect(c: CanvasRenderingContext2D, rect: BRect, color: BColor): void {
    c.fillStyle = color
    c.fillRect(rect.x, rect.y, rect.w, rect.h)
}
