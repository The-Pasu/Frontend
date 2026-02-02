export default defineBackground(() => {
  let pinnedWindowId: number | null = null;

  const sendCategoryToBackend = async (category: string) => {
    console.log("[Backend] Ready to send category", category);
  };

  browser.runtime.onMessage.addListener(async (message) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "PERMISSION_GRANTED") {
      await browser.storage.local.set({ hasPermission: true });
      return;
    }

    if (message.type === "CATEGORY_SELECTED") {
      if (typeof message.category === "string") {
        await browser.storage.local.set({ category: message.category });
        await sendCategoryToBackend(message.category);
      }
    }

    if (message.type === "OPEN_PINNED_POPUP") {
      if (pinnedWindowId) return;

      const url = browser.runtime.getURL("/popup.html?pinned=1" as `/popup.html${string}`);
      const created = await browser.windows.create({
        url,
        type: "popup",
        width: 420,
        height: 640,
      });

      pinnedWindowId = created.id ?? null;
    }
  });

  browser.windows.onRemoved.addListener((windowId) => {
    if (pinnedWindowId === windowId) {
      pinnedWindowId = null;
    }
  });
});
