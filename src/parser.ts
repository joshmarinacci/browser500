import ohm from "ohm-js"
import {
    BColor,
    BElement,
    BInsets,
    BlockStyle,
    BNode,
    BPoint,
    BRect,
    BSize,
    BStyleSet,
    BText,
    TextStyle
} from "./common";
// sub-line box spans with colored text
// noinspection JSUnusedLocalSymbols

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

export function parse(input:string):BElement {
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

    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let tokens:Token[] = semantics(res1).ast()
    let root = to_elements(tokens)
    let ch:BElement = (root as BElement).children[0] as BElement
    log("final dom is",ch)
    return ch
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


function sub_ins(size:BSize, ins:BInsets):BRect {
    return new BRect(ins.left, ins.top,
        size.w-ins.left-ins.right,size.h-ins.top-ins.bottom)
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
    text:string,
    style:TextStyle,
}


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

const DEBUG = {
    BLOCK:{
        PADDING:false,
    },
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
    translate(c,root.position)
    let insets = root.style.margin.add(root.style.border.thick)
    let rect = root.size.toRect().subtract_inset(insets)
    //draw background
    fill_rect(c,rect,root.style.background)
    //draw border
    stroke_rect(c,rect,root.style.border.thick.top,root.style.border.color)
    //draw children
    root.children.forEach((ch) => {
        if(ch.type === 'box') draw_box(c,ch as LayoutBox)
        if(ch.type === 'line') draw_line(c, ch as LineBox)
    })
    if(DEBUG.BLOCK.PADDING) {
        stroke_rect(c,sub_ins(root.size,root.style.margin.add(root.style.border.thick).add(root.style.padding)),2,'red')
    }
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

function translate(c: CanvasRenderingContext2D, position: BPoint) {
    c.translate(position.x,position.y)
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
