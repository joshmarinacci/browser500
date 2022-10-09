// pull out CSS strings
import {BElement, BInsets, BStyleSet, BText} from "./common";

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

// css string to CSS tree
export function parse_styles(_styles: string[]): BStyleSet {
    console.log("parsing styles",_styles)
    let styles = new BStyleSet()
    styles.block.set("html", {
        background: 'green',
        border: {
            color: 'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    styles.block.set('p', {
        background: 'white',
        border: {
            color: 'black',
            thick: BInsets.uniform(2),
        },
        padding: BInsets.uniform(10),
        margin: BInsets.uniform(0),
    })
    styles.text.set('p', {
        color: 'black',
        fontSize: 15,
    })
    return styles
}
