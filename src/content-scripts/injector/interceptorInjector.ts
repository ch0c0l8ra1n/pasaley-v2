const xhrOverrideScript = document.createElement('script');
xhrOverrideScript.type = 'text/javascript';
xhrOverrideScript.src = chrome.runtime.getURL('public/interceptor.js');

async function interceptData() {
    document.head.prepend(xhrOverrideScript);
    console.log("Prepended data!");
}

// Call the function when the document head is ready | CHATGPT
function callWhenHeadIsReady(callback: Function) {
    if (document.head) {
        callback();  // If document.head is already available
    } else {
        // Otherwise, observe mutations on the document
        const observer = new MutationObserver((_, observerInstance) => {
            if (document.head) {
                callback();  // Call the function once head is available
                observerInstance.disconnect();  // Stop observing
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
}

callWhenHeadIsReady(interceptData);