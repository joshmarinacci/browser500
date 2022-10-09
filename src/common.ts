export type BNode = BElement | BText
export type BElement = {
    readonly type: "element"
    readonly name: string
    readonly atts: Record<string, string>
    children: BNode[]
}
export type BText = {
    readonly type: "text"
    readonly text: string
}

export type BColor = string
export type BorderStyle = {
    color: BColor,
    thick: BInsets,
}

export class BInsets {
    top: number
    right: number
    bottom: number
    left: number

    constructor(top: number, right: number, bottom: number, left: number) {
        this.top = top
        this.right = right
        this.bottom = bottom
        this.left = left
    }

    static uniform(n: number): BInsets {
        return new BInsets(n, n, n, n)
    }

    add(thick: BInsets) {
        return new BInsets(
            this.top + thick.top,
            this.right + thick.right,
            this.bottom + thick.bottom,
            this.left + thick.left
        )
    }

    top_left():BPoint {
        return new BPoint(this.left,this.top)
    }
}

export type BlockStyle = {
    display:"block"|"inline",
    'background-color': BColor,
    border: BorderStyle,
    padding: BInsets,
    margin: BInsets
}
export type TextStyle = {
    'font-size': number,
    'font-weight':"normal"|"bold"
    'font-style':"normal"|"italic"
    color: BColor,
}

export class BPoint {
    readonly x: number
    readonly y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    add(bPoint: BPoint) {
        return new BPoint(this.x + bPoint.x, this.y + bPoint.y)
    }
}
export class BSize {
    w: number
    h: number
    constructor(w:number, h:number) {
        this.w = w
        this.h = h
    }

    toRect():BRect {
        return new BRect(0,0,this.w,this.h)
    }
}
export class BRect {
    readonly x: number
    readonly y: number
    readonly w: number
    readonly h: number

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
    }

    position(): BPoint {
        return new BPoint(this.x, this.y)
    }

    size(): BSize {
        return new BSize(this.w,this.h)
    }

    subtract_inset(inset: BInsets) {
        return new BRect(
            this.x + inset.left,
            this.y + inset.top,
            this.w - inset.left - inset.right,
            this.h - inset.top - inset.bottom
        )
    }

    top_left():BPoint {
        return new BPoint(this.x,this.y)
    }

    static fromPosSiz(position: BPoint, size: BSize) {
        return new BRect(position.x,position.y,size.w,size.h)
    }

    translate(position: BPoint) {
        return new BRect(this.x + position.x , this.y + position.y, this.w,this.h)
    }
}

export type LayoutChild = {
    type: 'box' | 'line'
}
export type LayoutBox = {
    type: 'box',
    element: BElement,
    position: BPoint,
    size: BSize,
    children: LayoutChild[],
    style: BlockStyle,
}
export class RunBox{
    type:'run'
    position: BPoint
    size: BSize
    text:string
    style:TextStyle

    constructor(text:string,position: BPoint, style: TextStyle) {
        this.position = position
        this.size = new BSize(10,10)
        this.text = text
        this.style = style
    }

    set_style(ctx: CanvasRenderingContext2D) {
        ctx.font = `${this.style["font-style"]} ${this.style["font-weight"]} ${this.style["font-size"]}px sans-serif`
        ctx.fillStyle = this.style.color
    }

    bounds() {
        return BRect.fromPosSiz(this.position,this.size)
    }
}
export type LineBox = {
    type: 'line',
    position: BPoint,
    size: BSize,
    runs:RunBox[],
}

export function log(...args: any[]) {
    console.log("LOG",...args)
}

// html string to token stream
// token stream to dom tree
// @ts-ignore
const elem = (name: string, atts: Record<string, string>, ...children: BNode[]): BElement => ({
    type: 'element',
    name,
    atts,
    children
})
// @ts-ignore
const text = (text: string): BText => ({type: 'text', text})
