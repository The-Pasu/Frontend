export default defineContentScript({
  matches: [
    "*://*.instagram.com/*",
    "*://*.web.telegram.org/*",
    "*://*.danggeun.com/*"
  ],
  main() {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/inject.js');
    script.onload = () => {
      script.remove();
    };
    script.onerror = (error) => {
      console.error('[Content Script] inject.js load failed', error);
    };
    
    (document.head || document.documentElement).appendChild(script);
  },
});
