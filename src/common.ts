export type BNode = BElement | BText
export class BElement {
    readonly type: "element"
    readonly name: string
    readonly atts: Record<string, string>
    children: BNode[]
    constructor(name:string, atts) {
        this.type = 'element'
        this.name = name
        this.atts = atts
        this.children = []
    }
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
    display:"block"|"inline"|"none"|"list-item",
    'background-color': BColor,
    border: BorderStyle,
    padding: BInsets,
    margin: BInsets,
    'text-align':"left"|"center"|"right",
}
export type TextStyle = {
    'font-size': number,
    'font-weight':"normal"|"bold"
    'font-style':"normal"|"italic"
    'text-decoration':'none'|'underline'
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
    scale(factor: number):BPoint {
        return new BPoint(this.x*factor,this.y*factor)
    }
    subtract(position: BPoint) {
        return new BPoint(this.x - position.x, this.y - position.y)
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
    middle_left() {
        return new BPoint(this.x,(this.y+this.h)/2)
    }

    static fromPosSiz(position: BPoint, size: BSize) {
        return new BRect(position.x,position.y,size.w,size.h)
    }

    translate(position: BPoint) {
        return new BRect(this.x + position.x , this.y + position.y, this.w,this.h)
    }
    contains(point:BPoint) {
        if(this.x > point.x) return false
        if(this.y > point.y) return false
        if(this.x+this.w < point.x) return false
        if(this.y+this.h < point.y) return false
        return true
    }
}


export class Box {
    type:string
    position: BPoint
    size: BSize
    constructor(type:string, position:BPoint, size:BSize) {
        this.type = type
        this.position = position
        this.size = size
    }
    bounds() {
        return BRect.fromPosSiz(this.position,this.size)
    }
}
export class LayoutBox extends Box {
    element: BElement
    children: Box[]
    style: BlockStyle
    constructor(element:BElement, position:BPoint, size:BSize, style:BlockStyle) {
        super('box',position,size)
        this.element = element
        this.children = []
        this.style = style
    }
}
export class RunBox extends Box {
    element:BElement
    text:string
    style:TextStyle

    constructor(text: string, position: BPoint, style: TextStyle, elem: BElement) {
        super('run',position,new BSize(10,10))
        this.text = text
        this.style = style
        this.element = elem
    }

    set_style(ctx: CanvasRenderingContext2D) {
        ctx.font = `${this.style["font-style"]} ${this.style["font-weight"]} ${this.style["font-size"]}px sans-serif`
        ctx.fillStyle = this.style.color
    }

}
export class LineBox extends Box {
    runs:RunBox[]
    constructor(position:BPoint, size:BSize) {
        super('line',position,size)
        this.runs = []
    }
}

export function log(...args: any[]) {
    console.log("LOG",...args)
}
