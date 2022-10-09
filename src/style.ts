// pull out CSS strings
import {BElement, BInsets, BStyleSet, BText} from "./common";
import ohm from "ohm-js";


const default_stylesheet = String.raw`
* {
    font-size: 10pt;
    display:block;
    color:black;
    background-color:white;
    padding: 0;
    margin: 0;
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

type CSSRule = {
    selector:string,
    props:CSSProp[],
}

type CSSProp = {
    name:string,
    value:string,
}

let grammar = ohm.grammar(raw_grammar)
let semantics = grammar.createSemantics()
// console.log("body_style is",body_style['background-color'])
semantics.addOperation('rules', {
    _terminal() {
        return this.sourceString
    },
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
    RuleItem:(name,_1,value,_2) => {
        console.log("property name",name.rules())
        console.log("property value",value.rules())
        let prop:CSSProp = {
            name:name.rules(),
            value:value.rules(),
        }
        return prop
    }
})

function parse_style_block(input: string, styles: BStyleSet) {
    console.log("parsing_style",input)
    let res1 = grammar.match(input)
    console.log("passed?",res1.succeeded())
    if (res1.failed()) throw new Error("match failed")
    let rules:CSSRule[] = semantics(res1).rules()
    console.log("rules are",rules)
    let record:Record<string, string> = {}
    rules.forEach(rule => {
        console.log("selector",rule.selector,rule.props)
        rule.props.forEach(prop => {
            record[prop.name] = prop.value
        })
    })
    console.log("record is",record)
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

    style_set.block.set("html", {
        background: 'green',
        border: {
            color: 'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    style_set.block.set('p', {
        background: 'white',
        border: {
            color: 'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    style_set.text.set('p', {
        color: 'black',
        fontSize: 15,
    })
    return style_set
}
