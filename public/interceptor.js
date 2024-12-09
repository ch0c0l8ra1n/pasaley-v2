var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const getHostCountry = () => {
  const arr = window.location.hostname.split(".");
  const country = arr[arr.length - 1];
  if (["np", "pk", "bd", "lk"].includes(country))
    return arr[arr.length - 1];
  return "";
};
const isExtension = chrome.runtime !== void 0;
function isProd() {
  return isExtension && "update_url" in chrome.runtime.getManifest();
}
class API {
  constructor() {
    __publicField(this, "DEV_BASE_URL", "https://127.0.0.1/api/v2");
    __publicField(this, "PROD_BASE_URL", "https://www.shakenep.com/api/v2");
    __publicField(this, "BASE_URL", isProd() ? "https://shakenep.com/api/v2" : "https://127.0.0.1/api/v2");
  }
  getBaseUrl() {
    return this.BASE_URL;
  }
  setBaseUrl(url) {
    this.BASE_URL = url;
  }
  setProd(enabled) {
    this.BASE_URL = enabled ? this.PROD_BASE_URL : this.DEV_BASE_URL;
  }
  async fetchJSON(input, initOptions = {}) {
    let resp;
    try {
      resp = await fetch(input, {
        credentials: "include",
        ...initOptions
      });
    } catch (err) {
      throw new Error(`Failed to fetch.`);
    }
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    return await resp.json();
  }
  async getPriceHistory(id, hostCountry) {
    var _a;
    const url = new URL(`${this.BASE_URL}/pricehistory`);
    const params = {
      id,
      hostCountry
    };
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
    const resp = await this.fetchJSON(url);
    if (resp.prices) return resp.prices;
    return (_a = resp == null ? void 0 : resp.data) == null ? void 0 : _a.prices;
  }
  async sendListItems(items) {
    console.log("Sending Items!");
    const hostCountry = getHostCountry();
    for (const item of items) {
      item.hostCountry = hostCountry;
    }
    const url = new URL(`${this.BASE_URL}/listitemsapi`);
    try {
      await this.fetchJSON(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          listItems: items,
          href: window.location.href
        }),
        credentials: "include"
      });
    } catch (err) {
      console.error(err);
    }
  }
}
const api = new API();
api.setProd(true);
var findItems = (data, parent = "ROOT") => {
  const items = [];
  for (const key of Object.getOwnPropertyNames(data)) {
    if (!data[key]) continue;
    if (Array.isArray(data[key]) && data[key].length > 0) {
      const condition = (item) => item.hasOwnProperty("itemId") && (item.hasOwnProperty("price") || item.hasOwnProperty("itemDiscountPrice"));
      if (data[key].some(condition)) {
        if (data[key].filter(condition).length > data[key].filter((item) => !condition(item)).length) {
          const valid_items = data[key].filter(condition);
          console.log(key, "Found items: ", valid_items);
          items.push(...valid_items);
        }
      } else {
        items.push(...findItems(data[key], `${parent} -> ${key}`));
      }
    } else if (typeof data[key] === "object") {
      items.push(...findItems(data[key], `${parent} -> ${key}`));
    }
  }
  return items;
};
const processItems = (items) => {
  console.log("Processing items: ", items);
  const uniqueItems = items.reduce((acc, item) => {
    const existingItem = acc.find((i) => i.itemId === item.itemId);
    if (existingItem) {
      Object.keys(item).forEach((key) => {
        if (existingItem[key] === void 0) {
          existingItem[key] = item[key];
        }
      });
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
  if (uniqueItems.length !== items.length) {
    console.log(`Duplicate items found | ${items.length} -> ${uniqueItems.length}`);
  }
  return uniqueItems;
};
let oldXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function() {
  this.addEventListener("load", async function() {
    const responseBody = this.responseText;
    try {
      const data = JSON.parse(responseBody);
      const items = findItems(data);
      const processedItems = processItems(items);
      if (items.length > 0)
        await api.sendListItems(processedItems);
    } catch (err) {
    }
  });
  return oldXHROpen.apply(this, arguments);
};
function callWhenBodyIsReady(callback) {
  if (document.body) {
    callback();
  } else {
    const observer = new MutationObserver((_, observerInstance) => {
      if (document.body) {
        callback();
        observerInstance.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}
const asleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
callWhenBodyIsReady(async () => {
  const win = window;
  await asleep(2e3);
  console.log(win.__FIRST_SCREEN_DATA);
  if (!win.__FIRST_SCREEN_DATA) return;
  const items = findItems(win.__FIRST_SCREEN_DATA);
  if (items.length > 0) {
    try {
      const processedItems = processItems(items);
      await api.sendListItems(processedItems);
    } catch (err) {
      console.error(err);
    }
  }
});
