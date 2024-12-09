import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChartApp from "./ChartApp";
import { asleep, getHostCountry, getPrice, getProductId } from "@/lib/utils";
import { setShadoDomStyles, setupShadowDOM } from "./shadowdom";
import { isExtension } from "@/lib/utils";
import './index.css';

if (isExtension) {

  (async () => {
    const pasaleyCSS = document.getElementById('pasaley-css');
    console.log("Pasaley CSS:", pasaleyCSS);
    const styles = pasaleyCSS ? pasaleyCSS.innerText : '';
    // remove pasaleyCSS from dom
    if (pasaleyCSS) pasaleyCSS.remove();

    while (!document.getElementsByClassName('breadcrumb_item')[0] || isNaN(getPrice())) {
      await asleep(300);
    }
    console.log("Product loaded in DOM!");

    setupShadowDOM();

    setShadoDomStyles(styles);

    const shadowHost = document.getElementById('pasaley-host');
    const pasaleyRoot = shadowHost?.shadowRoot?.getElementById('pasaley-root');
    createRoot(pasaleyRoot!).
      render(
        <StrictMode>
          <div className="py-2">
            <ChartApp productId={getProductId()} hostCountry={getHostCountry()} />
          </div>
        </StrictMode>
      );

  })();
}
else {
  // code runs in browser
  const pasaleyRoot = document.getElementById('pasaley-root');
  createRoot(pasaleyRoot!).
    render(
      // <StrictMode>
      <div>
        <div className="w-full h-lvh flex justify-center items-center">
          <div className='w-[480px]'>
            <ChartApp productId="128764645" hostCountry="np" />
          </div>
        </div>
      </div>        
      // </StrictMode>
    );
}