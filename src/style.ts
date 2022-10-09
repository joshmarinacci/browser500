// pull out CSS strings
import {BElement, BInsets, BStyleSet} from "./common";

export function extract_styles(_root: BElement): readonly string[] {
    // let res:BElement[] = findElemenstByName(root,'style');
    //find all style elements and pull out their
    return [`body {
              background-color: #ffffff;
              color: #ff0000;
            }`]
}

// css string to CSS tree
export function parse_styles(_styles: string[]): BStyleSet {
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
