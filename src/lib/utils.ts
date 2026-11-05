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

// The price shown on the product page ("Rs. 1,499" on .np, .pk and .lk, "৳ 1,499"
// on .bd): the first number in it, whatever the currency is written as.
const getPrice = () => {
    const text = document.getElementsByClassName("pdp-price")[0]?.textContent ?? "";
    const number = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
    return number ? parseFloat(number[0]) : NaN;
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