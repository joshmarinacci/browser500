// pull out CSS strings
import {BElement, BInsets, BlockStyle, BText, log, TextStyle} from "./common";
import ohm from "ohm-js";


const default_stylesheet = String.raw`
* {
    font-size: 10pt;
    display:block;
    color:black;
    background-color:white;
    padding: 5;
    margin: 5;
    border: 1px solid black;
}
`

const raw_grammar = String.raw`
CSS {
    RuleSet = Rule*
    Rule = ident "{" RuleBody "}"
    RuleBody = RuleItem*
    RuleItem = PropName ":" PropValue ";"
    ident = ("*" | letter | digit)+
    PropName = letter (letter | "-")*
    PropValue = (~";" any)+
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
    selector:string,
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
    Rule:(selector,_1,body,_2) => {
        let r:CSSRule = {
            selector:selector.rules(),
            props:body.rules(),
        }
        return r
    },
    PropName:(a,b) => a.rules() + b.rules().join(""),
    PropValue:(a) => a.rules().join(""),
    RuleItem:(name,_1,value,_2) => ({ name: name.rules(), value: value.rules() }),
})

export class BStyleSet {
    private def_text: TextStyle;
    private def_block: BlockStyle;
    private rules: CSSRule[];

    constructor() {
        this.rules = []
        this.def_block = {
            padding: BInsets.uniform(0),
            margin: BInsets.uniform(0),
            "background-color": 'white',
            border: {
                color: 'black',
                thick: BInsets.uniform(0)
            }
        }
        this.def_text = {
            color: 'black',
            'font-size': 10,
        }
    }

    lookup_block_style(name: string): BlockStyle {
        console.log("looking up style for element", name)
        let names = ['background-color', 'border', 'padding', 'margin']
        //lookup each property for the element
        let style_object = {}
        names.forEach(prop_name => {
            let value: any = this.lookup_property_value(prop_name, name)
            console.log("FINAL block style",prop_name,'=',value)
            style_object[prop_name] = value
        })
        console.log("FINAL",style_object)
        return style_object as BlockStyle
        // see if have that property for that element name
        // if not, get the property for the * name
        // if not, load from the default
        //group into a single chunk of styles
        //optionally cache it
    }

    lookup_text_style(name: string): TextStyle {
        let names = ['font-size','color'];
        let style_object = {}
        names.forEach(prop_name => {
            let value: any = this.lookup_property_value(prop_name, name)
            console.log("FINAL text style",prop_name,'=',value)
            style_object[prop_name] = value
        })
        console.log("FINAL",style_object)
        return style_object as TextStyle
    }

    private lookup_property_value(prop_name: string, elem_name: string) {
        // log(`looking up ${elem_name} # ${prop_name}`)
        // log("rules",this.rules)
        let val = this.def_block[prop_name]
        this.rules.filter(r => r.selector === elem_name || r.selector === "*").forEach(r => {
            // console.log("possible rule",r)
            r.props.filter(p => p.name === prop_name)
                .forEach((p => {
                    // console.log("prop is", r.selector, p.name, '=', p.value)
                    if (p.name === 'margin') {
                        val = BInsets.uniform(parseInt(p.value))
                        return
                    }
                    if (p.name === 'padding') {
                        val = BInsets.uniform(parseInt(p.value))
                        return
                    }
                    if (p.name === 'font-size')        {
                        val = parseInt(p.value)
                        return
                    }
                    if (p.name === 'color')            {
                        val = p.value
                        return
                    }
                    if (p.name === 'background-color') {
                        val = p.value
                        return
                    }
                    console.log("didn't match",p.name,p.value)
                    // val = p.value
                }))
        })
        // log("got", val)
        return val
    }

    append_style(rule: CSSRule) {
        this.rules.push(rule)
    }
}

function parse_style_block(input: string, styles: BStyleSet) {
    console.log("parsing_style",input)
    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let rules:CSSRule[] = semantics(res1).rules()
    console.log("rules are",rules)
    rules.forEach(rule => {
        console.log("selector",rule.selector,rule.props)
        styles.append_style(rule)
    })
    // change styles to cascade
    // request style for p should return a style object for p that falls back to the style object for body and then to html and then to the default
    // css properties can inherit from the parent
    // others can inherit from the generic element
    // elements inherit from generic element
    // if element doesn't have a property at all, then get it from the parent
    // BlockStyle represents the fully calculated styles
}

// css string to CSS tree
export function parse_styles(styles: string[]): BStyleSet {
    let style_set = new BStyleSet()
    parse_style_block(default_stylesheet,style_set)
    styles.forEach(input => parse_style_block(input,style_set))
    return style_set
}
