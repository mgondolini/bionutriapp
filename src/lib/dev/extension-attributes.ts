/**
 * Solo in sviluppo: alcune estensioni del browser (VPN e anti-tracker, id
 * `eppiocemhmnl…`) scrivono attributi come `bis_skin_checked`, `bis_register`
 * e `__processed_<uuid>__` nell'HTML prima che React lo idrati, e Next mostra
 * l'errore "A tree hydrated but some attributes… didn't match". Lo script,
 * inline nel layout radice, li toglie appena compaiono: un MutationObserver
 * risponde in un microtask, quindi prima dell'idratazione. In produzione non
 * serve (React non segnala gli attributi diversi) e non viene incluso.
 */
export const EXTENSION_ATTRIBUTE = /^(bis_|__processed_)/;

export const STRIP_EXTENSION_ATTRIBUTES = `(function(){var r=${EXTENSION_ATTRIBUTE.toString()};function c(e){for(var i=e.attributes.length-1;i>=0;i--){var n=e.attributes[i].name;if(r.test(n))e.removeAttribute(n);}}c(document.documentElement);document.querySelectorAll("*").forEach(c);new MutationObserver(function(l){l.forEach(function(m){if(m.attributeName&&r.test(m.attributeName))m.target.removeAttribute(m.attributeName);});}).observe(document.documentElement,{attributes:true,subtree:true});})();`;
