import {BElement, BInsets, BlockStyle, BorderStyle, BText, TextStyle} from "./common";
import ohm from "ohm-js";


function log(...args: any[]) {
    // console.log("LOG",...args)
}

const raw_grammar = String.raw`
CSS {
    RuleSet = Rule*
    Rule = Selector "{" RuleBody "}"
    Selector = ListOf<ident, ",">
    RuleBody = RuleItem*
    RuleItem = PropName ":" propValue ";"
    ident = ("*" | letter | digit)+
    PropName = letter (letter | "-")*
    propValue = (~";" any)+
}
`

function findByName(node: BElement, name: string):BElement[] {
    return node.children.map(ch => {
        if(ch.type === 'element') {
            let elm = ch as BElement
            if(elm.name === name) {
                return [elm]
            } else {
                return findByName(elm,name)
            }
        } else {
            return []
        }
    }).flat()
}

export function extract_styles(root: BElement): readonly string[] {
    return findByName(root,'style')// find every style node
        .map(el => el.children
            .filter(ch => ch.type === 'text') // get the text nodes
            .map((text: BText) => text.text)) // extract the text
        .flat() // flatten
}

export type CSSRule = {
    selectors:string[],
    props:CSSProp[],
}

export type CSSProp = {
    name:string,
    value:string,
}

let grammar = ohm.grammar(raw_grammar)
let semantics = grammar.createSemantics()

semantics.addOperation('rules', {
    _terminal() { return this.sourceString },
    _iter: (...children) => children.map(c => c.rules()),
    ident: (b) => b.rules().join(""),
    Rule:(selector,_1,body,_2) => ({ selectors:selector.rules(), props:body.rules()}),
    PropName:(a,b) => a.rules() + b.rules().join(""),
    propValue:(a) => a.rules().join(""),
    RuleItem:(name,_1,value,_2) => ({ name: name.rules(), value: value.rules() }),
    Selector:(a) => a.asIteration().rules()
})


export class BStyleSet {
    private def_text: TextStyle;
    private def_block: BlockStyle;
    private rules: CSSRule[];
    private base_font_size: number;
    private font_scale: number;

    constructor(base_font_size: number, font_scale: number) {
        this.rules = []
        this.base_font_size = base_font_size
        this.font_scale = font_scale
        this.def_block = {
            display:"block",
            padding: BInsets.uniform(0),
            margin: BInsets.uniform(0),
            "background-color": 'white',
            "text-align":"left",
            border: {
                color: 'black',
                thick: BInsets.uniform(0)
            }
        }
        this.def_text = {
            color: 'black',
            'font-size': 10,
            "font-weight":'normal',
            "font-style":'normal',
            'text-decoration':"none",
            'font-family':"sans-serif",
        }
    }

    lookup_block_style(name: string): BlockStyle {
        let names = ['display','background-color', 'border', 'padding', 'margin','text-align']
        let style_object = {}
        names.forEach(prop_name => style_object[prop_name] = this.lookup_property_value(prop_name, name))
        log(`FINAL block style for ${name}:`,style_object)
        return style_object as BlockStyle
    }

    lookup_text_style(name: string): TextStyle {
        let names = ['color','font-size','font-weight','font-style','text-decoration','font-family'];
        let style_object = {}
        names.forEach(prop_name => style_object[prop_name] = this.lookup_property_value(prop_name, name))
        return style_object as TextStyle
    }

    private lookup_property_value(prop_name: string, elem_name: string) {
        // log(`looking up ${elem_name} # ${prop_name}`)
        // log("rules",this.rules)
        let val = this.def_block[prop_name]
        this.rules.filter(r => r.selectors.includes(elem_name) || r.selectors.includes("*"))
            .forEach(r => {
            r.props.filter(p => p.name === prop_name)
                .forEach((p => { val = this.get_prop_value(p) }))
        })
        return val
    }

    append_style(rule: CSSRule) {
        this.rules.push(rule)
    }
    private get_prop_value(p: CSSProp):any {
        // log("prop is", p.name, '=', p.value)
        if (p.name === 'margin')      return BInsets.uniform(this.scale_prop(parseInt(p.value)))
        if (p.name === 'padding')     return BInsets.uniform(this.scale_prop(parseInt(p.value)))
        if (p.name === 'font-size')   {
            if(p.value.endsWith("%")) {
                return this.scale_prop(parseInt(p.value)/100*this.base_font_size)
            }
            return this.scale_prop(parseInt(p.value))
        }
        if (p.name === 'font-weight') return p.value
        if (p.name === 'font-style')  return p.value
        if (p.name === 'font-family') return p.value
        if (p.name === 'color')       return p.value
        if (p.name === 'display')     return p.value
        if (p.name === 'background-color') return p.value
        if (p.name === 'text-decoration') return p.value
        if (p.name === 'text-align') return p.value
        if (p.name === 'border') {
            let parts = p.value.split(" ");
            return {
                color: parts[2],
                thick: BInsets.uniform(this.scale_prop(parseInt(parts[0])))
            }
        }
        console.warn("missing handler for css prop",p)
        return p.value
    }

    public scale_prop(number: number) {
        return number*this.font_scale
    }
}

function parse_style_block(input: string, styles: BStyleSet) {
    let res1 = grammar.match(input)
    if (res1.failed()) return console.warn("Invalid CSS",input);
    let rules:CSSRule[] = semantics(res1).rules()
    rules.forEach(rule => styles.append_style(rule))
}

export function parse_styles(styles: string[], default_stylesheet: string, base_font_size: number, font_scale: number): BStyleSet {
    let style_set = new BStyleSet(base_font_size, font_scale)
    parse_style_block(default_stylesheet, style_set)
    styles.forEach(input => parse_style_block(input, style_set))
    return style_set
}
