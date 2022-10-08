import ohm from "ohm-js"
/*
next up
 real line wrapping layout
 really generate boxes from the incoming DOM
 sub-line box spans with colored text
 // get the style objects from the StyleSet object
 */

// noinspection JSUnusedLocalSymbols

export type BNode = BElement | BText
export type BElement = {
    readonly type:"element"
    readonly name:string
    readonly atts:Record<string, string>
    children: BNode[]
}
export type BText = {
    readonly type:"text"
    readonly text:string
}

class Loggo {
    private depth: number;
    private tab_char:string
    private prefix: string;
    constructor() {
        this.depth = 0
        this.tab_char = "    "
        this.prefix = "-"
    }
    indent() {
        this.depth++
    }
    outdent() {
        this.depth--
    }
    print(...args:any[]) {
        let inset = ""
        for(let i=0; i<this.depth; i++) {
            inset += this.tab_char
        }
        console.log(this.prefix + inset,...args)
    }

    set_prefix(s:string) {
        this.prefix = s
    }
    set_tab(s: string) {
        this.tab_char = s
    }

    inspect(obj:any) {
        this.print(JSON.stringify(obj,null,"    "));
    }
}


const raw_grammar = String.raw`
HTML {
  TokenStream = Token+
  Token = Open | text | Close | Empty
  la = "<"
  ra = ">"
  ident = letter (letter | digit)*
  Open = la ident Atts ra
  Close = la "/" ident ra
  Empty = la ident "/" ra
  text = (~la any)+
  Atts = ListOf<Att," ">
  q = "\'"
  qq = "\""
  Att = ident "=" AttVal
  AttVal = q (~q any)+ q     -- q
         | qq (~qq any)+ qq  -- qq
}
`

// html string to token stream
// token stream to dom tree
// @ts-ignore
const elem = (name:string,atts:Record<string, string>,...children:BNode[]):BElement => ({ type:'element', name, atts,children})
// @ts-ignore
const text = (text:string):BText => ({type:'text', text})

export function parse(input:string):BElement {
    const L = new Loggo()

    type Open = {
        type:'open',
        value:string,
        atts:{},
    }
    type Text = {
        type:'text',
        value:string,
    }
    type Close = {
        type:'close'
        value:string,
    }
    type Empty = {
        type:'empty',
        value:string,
    }
    type Token = | Open | Text | Close | Empty

    const pairs_to_map = (pairs:string[][])=>{
        let obj:Record<string, string> = {}
        pairs.forEach(([k, v]) =>  obj[k] = v)
        return obj
    }

    let grammar = ohm.grammar(raw_grammar)
    let semantics = grammar.createSemantics()
    semantics.addOperation('ast', {
        _terminal() { return this.sourceString },
        _iter:(...children) => children.map(c => c.ast()),
        ident:(a,b) => a.ast() + b.ast().join(""),
        Open:(_a,b,atts,_c) => ({type:"open",value:b.ast(), atts:atts.ast()}),
        Atts:(a) => pairs_to_map(a.asIteration().children.map((ch:any) => ch.ast())),
        Att:(name,_eq,value)=> [name.ast(),value.ast()],
        AttVal_q :(_q1,value,_q2) => value.ast().join(""),
        AttVal_qq:(_q1,value,_q2) => value.ast().join(""),
        Close:(_a,_a1, b,_c) => ({type:"close",value:b.ast()}),
        Empty:(_a,b,_c,_d)=>({type:"empty",value:b.ast()}),
        text:(t) => ({type:"text",value:t.ast().join("")}),
    })

    function to_elements(tokens:Token[]):BNode {
        let stack:BNode[] = []
        let root:BElement = {
            type:"element",
            name:"root",
            atts:{},
            children:[]
        }
        stack.push(root)
        for(let tok of tokens) {
            // L.print("token",tok);
            if(tok.type === "open") {
                let elem:BElement = {
                    type:"element",
                    name:tok.value,
                    atts:(tok as Open).atts,
                    children:[]
                }
                let last = stack[stack.length-1] as BElement
                if(last) last.children.push(elem)
                stack.push(elem)
            }
            if(tok.type === "text") {
                let text:BText = {
                    type:"text",
                    text:tok.value,
                }
                let last = stack[stack.length-1] as BElement
                last.children.push(text)
            }
            if(tok.type === "close") {
                // let last = stack[stack.length-1] as Element
                stack.pop()
            }
            if(tok.type === 'empty') {
                let elem:BElement = {
                    type:"element",
                    name:tok.value,
                    atts:{},
                    children:[]
                }
                let last = stack[stack.length-1] as BElement
                if(last) last.children.push(elem)
                stack.push(elem)
            }
        }
        return stack[0]
    }

    L.print("input is",input)
    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let tokens:Token[] = semantics(res1).ast()
    // L.print("tokens",tokens)
    let root = to_elements(tokens)
    // L.inspect(root)

    let ch:BElement = (root as BElement).children[0] as BElement
    console.log("final dom is",ch)
    return ch
}


export class BStyleSet {
    block: Map<string,BlockStyle>
    text:Map<string,TextStyle>
    private def_text: TextStyle;
    private def_block: BlockStyle;
    constructor() {
        this.block = new Map()
        this.text = new Map()
        this.def_block = {
            padding:BInsets.uniform(0),
            margin:BInsets.uniform(0),
            background:'white',
            border:{
                color:'black',
                thick:BInsets.uniform(0)
            }
        }
        this.def_text = {
            color:'black',
            fontSize:10,
        }
    }
    lookup_block_style(name: string):BlockStyle {
        return this.block.has(name)?this.block.get(name) as BlockStyle:this.def_block
    }
    lookup_text_style(name: string):TextStyle {
        return this.text.has(name) ? this.text.get(name) as TextStyle : this.def_text
    }
}
export type BColor = string
export type BorderStyle = {
    color:BColor,
    thick:BInsets,
}
export class BInsets{
    top:number
    right:number
    bottom:number
    left:number
    constructor(top:number,right:number,bottom:number,left:number) {
        this.top = top
        this.right = right
        this.bottom = bottom
        this.left = left
    }

    static uniform(n: number):BInsets {
        return new BInsets(n,n,n,n)
    }

    add(thick: BInsets) {
        return new BInsets(
            this.top + thick.top,
            this.right + thick.right,
            this.bottom + thick.bottom,
            this.left + thick.left
        )
    }
}
export type BlockStyle = {
    background:BColor,
    border:BorderStyle,
    padding:BInsets,
    margin:BInsets
}
export type TextStyle = {
    fontSize:number,
    color:BColor,
}

// pull out CSS strings
export function extract_styles(_root:BElement):readonly string[] {
    // let res:BElement[] = findElemenstByName(root,'style');
    //find all style elements and pull out their
    return [`body {
              background-color: #ffffff;
              color: #ff0000;
            }`]
}
// css string to CSS tree
export function parse_styles(_styles:string[]):BStyleSet {
    let styles = new BStyleSet()
    styles.block.set("html", {
        background:'green',
        border: {
            color:'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    styles.block.set('body',{
        background: 'white',
        border: {
            color:'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    styles.text.set('body',{
        color: 'black',
        fontSize: 15,
    })
    return styles
}


type BSize = {
    w:number,
    h:number,
}
class BRect {
    readonly x:number
    readonly y:number
    readonly w:number
    readonly h:number
    constructor(x:number,y:number,w:number,h:number) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
    }
    position(): BPoint {
        return new BPoint(this.x,this.y)
    }
    size(): BSize {
        return {w:this.w, h:this.h}
    }
}
function sub_ins(size:BSize, ins:BInsets):BRect {
    return new BRect(ins.left, ins.top,
        size.w-ins.left-ins.right,size.h-ins.top-ins.bottom)
}

class BPoint {
    readonly x:number
    readonly y:number
    constructor(x:number, y:number) {
        this.x = x
        this.y = y
    }

    add(bPoint: BPoint) {
        return new BPoint(this.x+bPoint.x,this.y+bPoint.y)
    }
}

export type LayoutChild = {
    type:'box'|'line'
}
export type LayoutBox = {
    type:'box',
    element:BElement,
    position:BPoint,
    size:BSize,
    children:LayoutChild[],
    style:BlockStyle,
}
export type LineBox = {
    type:'line',
    position:BPoint,
    size:BSize,
    lineHeight: number,
    text:string,
    style:TextStyle,
}


function log(...args: any[]) {
    console.log("LOG",...args)
}


const make_box_from_style = (element: BElement, styles: BStyleSet, size: BSize, min: BPoint):LayoutBox => {
    let style = styles.lookup_block_style(element.name)
    return { type:"box", position:min, size, element:element, children:[], style }
}

function box_text_layout(elem: BElement, bounds: BRect, styles: BStyleSet, min: BPoint):LayoutBox {
    log("box_text_layout",elem.name,min,elem)
    let body_box:LayoutBox = make_box_from_style(elem,styles,bounds.size(),min)
    log("text child is",elem.children)
    //get the text children as strings
    let text_lines:string[] = elem.children.map((ch:BNode) => ((ch as BText).text))
    let lowest = 0
    let insets:BInsets = body_box.style.margin.add(body_box.style.border.thick).add(body_box.style.padding)
    let text_style:TextStyle = styles.lookup_text_style(body_box.element.name)
    body_box.children = text_lines.map((text, i) => {
        let lh = text_style.fontSize*1.5
        let position = { x: insets.left, y: i * lh + insets.top }
        let size = { w: bounds.w - insets.left - insets.right, h: lh }
        lowest = Math.max(lowest, position.y + size.h)
        return { type: 'line', position: position, size: size, lineHeight: lh, text, style: text_style, }
    })
    body_box.size = {w:body_box.size.w,h:lowest + insets.bottom};
    return body_box
}

function box_box_layout(element: BElement, styles: BStyleSet, canvas_size: BSize, position:BPoint):LayoutBox {
    log("layout of",element.name,'at',position)
    let html_box:LayoutBox = make_box_from_style(element, styles, canvas_size, position)
    let inset = html_box.style.margin.add(html_box.style.border.thick).add(html_box.style.padding)
    let body_bounds:BRect = sub_ins(html_box.size,inset)
    let lowest:BPoint = new BPoint(body_bounds.x,body_bounds.y)
    element.children.forEach((ch) => {
        if(ch.type === 'element') {
            let elem = ch as BElement
            if(elem.name === 'body') {
                let box  = box_text_layout(elem, body_bounds, styles, lowest)
                lowest = new BPoint(lowest.x,box.position.y+box.size.h)
                html_box.children.push(box)
            }
            if(elem.name === 'p') {
                let box = box_text_layout(elem,body_bounds, styles,lowest)
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

// dom tree + css tree -> layout tree
export function layout(element:BElement, styles:BStyleSet, canvas:HTMLCanvasElement):LayoutBox {
    log("doing layout",element)
    let canvas_size:BSize = { w: canvas.width, h: canvas.height}
    return box_box_layout(element,styles,canvas_size, new BPoint(0,0))
}

const DEBUG = {
    TEXT:{
        LINES:false,
    }
}


// layout tree to canvas
export function render(root:LayoutBox, canvas:HTMLCanvasElement):void {
    let c = canvas.getContext('2d') as CanvasRenderingContext2D
    draw_box(c,root)
}

function draw_box(c:CanvasRenderingContext2D, root:LayoutBox):void {
    c.save()
    c.translate(root.position.x,root.position.y)
    let ins = root.style.margin.add(root.style.border.thick)
    let rect = sub_ins(root.size,ins)
    //draw background
    fill_rect(c,rect,root.style.background)
    //draw border
    stroke_rect(c,rect,root.style.border.thick.top,root.style.border.color)
    //draw children
    root.children.forEach((ch) => {
        if(ch.type === 'box') draw_box(c,ch as LayoutBox)
        if(ch.type === 'line') draw_line(c, ch as LineBox)
    })
    c.restore()
}
function draw_line(c: CanvasRenderingContext2D, line:LineBox) {
    c.fillStyle = line.style.color
    c.font = `${line.style.fontSize}px sans-serif`
    c.fillText(line.text,line.position.x,line.position.y + line.style.fontSize)
    if(DEBUG.TEXT.LINES) {
        c.strokeStyle = 'black'
        c.lineWidth = 1;
        c.strokeRect(line.position.x+0.5,line.position.y+0.5,line.size.w,line.size.h)
    }
}

function stroke_rect(c:CanvasRenderingContext2D, rect:BRect, thick:number,color:BColor):void {
    c.lineWidth = thick
    c.strokeStyle = color
    c.strokeRect(rect.x,rect.y,rect.w,rect.h)
}
function fill_rect(c:CanvasRenderingContext2D, rect:BRect, color:BColor):void {
    c.fillStyle = color
    c.fillRect(rect.x,rect.y,rect.w, rect.h)
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
