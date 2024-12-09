import { isExtension } from '@/lib/utils'


export let pasaelyRoot : Document | HTMLDivElement = document;

export let shadowHost : HTMLDivElement | null = null;
export let shadowRoot : ShadowRoot | null = null;
export let shadowComponentWrapper : HTMLDivElement | null = null;
export let stylesRoot : HTMLStyleElement | null = null;

export const setShadoDomStyles = (styles: string) => {
    if (!stylesRoot) throw new Error('Shadow DOM not set up yet.');
    stylesRoot.innerText = styles;
}

export const setupShadowDOM = () => {
    if (!isExtension) return;

    const targetNode = document.getElementById('module_product_price_1');
    if (!targetNode) throw new Error('Daraz layout changed. Need to update source.');

    shadowHost = document.createElement('div');
    shadowHost.id = 'pasaley-host';

    targetNode.prepend(shadowHost);

    shadowRoot = shadowHost.attachShadow({mode: 'open'});

    shadowComponentWrapper = document.createElement('div');
    shadowComponentWrapper.id = 'pasaley-root-wrapper';

    shadowRoot.appendChild(shadowComponentWrapper);

    stylesRoot = document.createElement('style');
    stylesRoot.id = 'pasaley-root-styles';

    shadowComponentWrapper.appendChild(stylesRoot);

    pasaelyRoot = document.createElement('div');
    pasaelyRoot.id = 'pasaley-root';
    shadowComponentWrapper.appendChild(pasaelyRoot);
}