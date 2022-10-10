import {BElement, BNode, BText} from "./common";
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
    type Token = {
        type:'open'|'text'|'close'|'empty',
        value: string,
        atts?: {},
    }

    const pairs_to_map = (pairs: string[][]) => {
        let obj: Record<string, string> = {}
        pairs.forEach(([k, v]) => obj[k] = v)
        return obj
    }

    let grammar = ohm.grammar(raw_grammar)
    let semantics = grammar.createSemantics()
    semantics.addOperation('ast', {
        _terminal() { return this.sourceString },
        _iter: (...children) => children.map(c => c.ast()),
        ident: (a, b) => (a.ast() + b.ast().join("")).toLowerCase(),
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
        let root: BElement = new BElement('root',{})
        stack.push(root)
        for (let tok of tokens) {
            if (tok.type === "open") {
                let elem: BElement = new BElement(tok.value,tok.atts);
                let last = stack[stack.length - 1] as BElement
                if (last) last.children.push(elem)
                stack.push(elem)
            }
            if (tok.type === "text") {
                let text: BText = { type: "text", text: tok.value, }
                let last = stack[stack.length - 1] as BElement
                last.children.push(text)
            }
            if (tok.type === "close") {
                stack.pop()
            }
            if (tok.type === 'empty') {
                let elem: BElement = new BElement(tok.value,{});
                let last = stack[stack.length - 1] as BElement
                if (last) last.children.push(elem)
                stack.push(elem)
            }
        }
        return stack[0]
    }

    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let root = to_elements(semantics(res1).ast())
    return (root as BElement).children[0] as BElement
}
