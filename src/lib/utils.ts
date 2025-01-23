import { clsx } from "clsx";
import { ClassNameValue, twMerge } from "tailwind-merge"

function cn(...inputs: ClassNameValue[]) {
    return twMerge(clsx(inputs));
}

const getProductId = () => {
    const pattern = /i\d+/g;
    const matches = window.location.pathname.match(pattern);
    if (matches) {
        const match = matches[matches.length - 1];
        // remove the i from the match
        return match.substring(1);
    }
    return "";
}

const getHostCountry = () => {
    const arr = window.location.hostname.split(".");
    const country = arr[arr.length - 1];
    if (["np", "pk", "bd", "lk"].includes(country))
        return arr[arr.length - 1];
    return "";
}


const getItemQuantity:() => Number = () => {
    const quantityInput = document.getElementById('module_quantity-input');
    if (quantityInput) {
        const inputElem = quantityInput.querySelector('input');
        if (inputElem) {
            return parseInt(inputElem.value);
        }
    }
    return NaN;
}

const isExtension = () => {
    try{
        return chrome.runtime !== undefined;
    }
    catch (err){
        return true;
    }
}

function isProd() {
    try{
        return isExtension() && ('update_url' in chrome.runtime.getManifest());
    }
    catch (err){
        return true;
    }
  }

const getPrice = () => {
    try {
        const priceElem = document.getElementsByClassName("pdp-price")[0];
        if (!priceElem) return NaN;
        if (!priceElem.textContent) return NaN;
        const price = parseInt(
            priceElem.textContent
                .replace("Rs.", "")
                .replace("৳", "")
                .replaceAll(",", "")
                .trim()
        );
        return price;
    }
    catch (err) {
        return NaN;
    }
}

const asleep = (delay: number) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  }



export {
    cn,
    getProductId,
    getHostCountry,
    getPrice,
    isExtension,
    isProd,
    getItemQuantity,
    asleep
}