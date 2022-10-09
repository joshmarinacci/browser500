import {BElement, BNode, BText, log} from "./common";
import ohm from "ohm-js";

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

export function parse_html(input: string): BElement {
    type Open = {
        type: 'open',
        value: string,
        atts: {},
    }
    type Text = {
        type: 'text',
        value: string,
    }
    type Close = {
        type: 'close'
        value: string,
    }
    type Empty = {
        type: 'empty',
        value: string,
    }
    type Token = | Open | Text | Close | Empty

    const pairs_to_map = (pairs: string[][]) => {
        let obj: Record<string, string> = {}
        pairs.forEach(([k, v]) => obj[k] = v)
        return obj
    }

    let grammar = ohm.grammar(raw_grammar)
    let semantics = grammar.createSemantics()
    semantics.addOperation('ast', {
        _terminal() {
            return this.sourceString
        },
        _iter: (...children) => children.map(c => c.ast()),
        ident: (a, b) => a.ast() + b.ast().join(""),
        Open: (_a, b, atts, _c) => ({type: "open", value: b.ast(), atts: atts.ast()}),
        Atts: (a) => pairs_to_map(a.asIteration().children.map((ch: any) => ch.ast())),
        Att: (name, _eq, value) => [name.ast(), value.ast()],
        AttVal_q: (_q1, value, _q2) => value.ast().join(""),
        AttVal_qq: (_q1, value, _q2) => value.ast().join(""),
        Close: (_a, _a1, b, _c) => ({type: "close", value: b.ast()}),
        Empty: (_a, b, _c, _d) => ({type: "empty", value: b.ast()}),
        text: (t) => ({type: "text", value: t.ast().join("")}),
    })

    function to_elements(tokens: Token[]): BNode {
        let stack: BNode[] = []
        let root: BElement = {
            type: "element",
            name: "root",
            atts: {},
            children: []
        }
        stack.push(root)
        for (let tok of tokens) {
            // L.print("token",tok);
            if (tok.type === "open") {
                let elem: BElement = {
                    type: "element",
                    name: tok.value,
                    atts: (tok as Open).atts,
                    children: []
                }
                let last = stack[stack.length - 1] as BElement
                if (last) last.children.push(elem)
                stack.push(elem)
            }
            if (tok.type === "text") {
                let text: BText = {
                    type: "text",
                    text: tok.value,
                }
                let last = stack[stack.length - 1] as BElement
                last.children.push(text)
            }
            if (tok.type === "close") {
                // let last = stack[stack.length-1] as Element
                stack.pop()
            }
            if (tok.type === 'empty') {
                let elem: BElement = {
                    type: "element",
                    name: tok.value,
                    atts: {},
                    children: []
                }
                let last = stack[stack.length - 1] as BElement
                if (last) last.children.push(elem)
                stack.push(elem)
            }
        }
        return stack[0]
    }

    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let tokens: Token[] = semantics(res1).ast()
    let root = to_elements(tokens)
    let ch: BElement = (root as BElement).children[0] as BElement
    log("final dom is", ch)
    return ch
}
