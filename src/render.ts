import {BColor, BPoint, BRect, LayoutBox, LineBox} from "./common";

const DEBUG = {
    BLOCK: {
        PADDING: false,
    },
    TEXT: {
        LINES: false,
    }
}

// layout tree to canvas
export function render(root: LayoutBox, canvas: HTMLCanvasElement): void {
    let c = canvas.getContext('2d') as CanvasRenderingContext2D
    draw_box(c, root)
}

function draw_box(c: CanvasRenderingContext2D, root: LayoutBox): void {
    c.save()
    translate(c, root.position)
    let insets = root.style.margin.add(root.style.border.thick)
    let rect = root.size.toRect().subtract_inset(insets)
    //draw background
    fill_rect(c, rect, root.style.background)
    //draw border
    stroke_rect(c, rect, root.style.border.thick.top, root.style.border.color)
    //draw children
    root.children.forEach((ch) => {
        if (ch.type === 'box') draw_box(c, ch as LayoutBox)
        if (ch.type === 'line') draw_line(c, ch as LineBox)
    })
    if (DEBUG.BLOCK.PADDING) {
        stroke_rect(c, root.size.toRect().subtract_inset(root.style.margin.add(root.style.border.thick).add(root.style.padding)), 2, 'red')
    }
    c.restore()
}

function draw_line(c: CanvasRenderingContext2D, line: LineBox) {
    c.fillStyle = line.style.color
    c.font = `${line.style.fontSize}px sans-serif`
    c.fillText(line.text, line.position.x, line.position.y + line.style.fontSize)
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
    c.lineWidth = thick
    c.strokeStyle = color
    c.strokeRect(rect.x, rect.y, rect.w, rect.h)
}

function fill_rect(c: CanvasRenderingContext2D, rect: BRect, color: BColor): void {
    c.fillStyle = color
    c.fillRect(rect.x, rect.y, rect.w, rect.h)
}
