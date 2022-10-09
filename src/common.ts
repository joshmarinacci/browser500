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

export class BStyleSet {
    block: Map<string, BlockStyle>
    text: Map<string, TextStyle>
    private def_text: TextStyle;
    private def_block: BlockStyle;

    constructor() {
        this.block = new Map()
        this.text = new Map()
        this.def_block = {
            padding: BInsets.uniform(0),
            margin: BInsets.uniform(0),
            background: 'white',
            border: {
                color: 'black',
                thick: BInsets.uniform(0)
            }
        }
        this.def_text = {
            color: 'black',
            fontSize: 10,
        }
    }

    lookup_block_style(name: string): BlockStyle {
        return this.block.has(name) ? this.block.get(name) as BlockStyle : this.def_block
    }

    lookup_text_style(name: string): TextStyle {
        return this.text.has(name) ? this.text.get(name) as TextStyle : this.def_text
    }
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
    background: BColor,
    border: BorderStyle,
    padding: BInsets,
    margin: BInsets
}
export type TextStyle = {
    fontSize: number,
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
