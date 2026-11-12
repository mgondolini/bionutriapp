/**
 * HTML incollato da Word, Google Docs o pagine web: restano solo testo,
 * paragrafi, titoli, elenchi, grassetto e corsivo (lo schema dell'editor
 * scarta poi tutto il resto). Stili, classi, colori, link, immagini, tabelle
 * e commenti condizionali di Word spariscono (un <mark> diventa
 * l'evidenziatore pesca); grassetto e corsivo scritti
 * come stile diventano <strong> ed <em>; i titoli diventano h2 o h3.
 * Gira solo nel browser (DOMParser).
 */
const DROP = "style, script, meta, link, title, img, svg, picture, video, audio, iframe, object, embed, form, input, button, select, textarea";
const BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BR", "STRONG", "B", "EM", "I", "MARK"]);

function styleOf(element: Element): CSSStyleDeclaration | null {
  return element instanceof HTMLElement ? element.style : null;
}

function rename(element: Element, tag: string): Element {
  const next = element.ownerDocument.createElement(tag);
  while (element.firstChild) next.appendChild(element.firstChild);
  element.replaceWith(next);
  return next;
}

function unwrap(element: Element) {
  element.replaceWith(...Array.from(element.childNodes));
}

export function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(DROP).forEach((node) => node.remove());
  // commenti (anche i condizionali di Word)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((node) => node.parentNode?.removeChild(node));

  // dal basso verso l'alto: i figli prima dei genitori
  const elements = Array.from(doc.body.querySelectorAll("*")).reverse();
  for (const original of elements) {
    let element = original;
    const style = styleOf(element);
    const weight = style?.fontWeight ?? "";
    const bold =
      weight === "bold" || weight === "bolder" || Number(weight) >= 600;
    const italic = style?.fontStyle === "italic";
    // Google Docs avvolge tutto in <b style="font-weight:normal">
    const fakeBold = element.tagName === "B" && /^(normal|[1-5]00)$/.test(weight);

    const tag = element.tagName;
    if (tag === "H1") element = rename(element, "h2");
    else if (tag === "H4" || tag === "H5" || tag === "H6") {
      element = rename(element, "h3");
    } else if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE" || tag === "BLOCKQUOTE" || tag === "PRE") {
      element = rename(element, "p");
    } else if (tag === "TD" || tag === "TH") {
      element = rename(element, "p");
    }

    for (const name of element.getAttributeNames()) {
      element.removeAttribute(name);
    }

    if (fakeBold) {
      unwrap(element);
      continue;
    }
    if (!BLOCKS.has(element.tagName)) {
      // span, a, font, tabelle…: resta il contenuto, con grassetto e corsivo dallo stile
      if (bold || italic) {
        let wrapper = element;
        if (bold) wrapper = rename(wrapper, "strong");
        if (italic) {
          const em = element.ownerDocument.createElement("em");
          while (wrapper.firstChild) em.appendChild(wrapper.firstChild);
          wrapper.appendChild(em);
        }
        continue;
      }
      unwrap(element);
      continue;
    }
  }
  return doc.body.innerHTML;
}
