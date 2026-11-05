import { clsx } from "clsx";
import { ClassNameValue, twMerge } from "tailwind-merge"

function cn(...inputs: ClassNameValue[]) {
    return twMerge(clsx(inputs));
}

// The last "i<digits>" in the path, without the i.
const getProductId = () => {
    const matches = window.location.pathname.match(/i\d+/g);
    const last = matches?.[matches.length - 1];
    return last ? last.substring(1) : "";
}

const getHostCountry = () => {
    const country = window.location.hostname.split(".").pop() ?? "";
    return ["np", "pk", "bd", "lk"].includes(country) ? country : "";
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
    getItemQuantity,
    asleep
}