/* Sdílená konfigurace se ukládá s kontrolou verze, aby se nepřepsaly souběžné úpravy. */
window.QBSourceConfig = (() => {
  function webUrl(value, required = false) {
    if (!value && !required) return "";
    let url;
    try { url = new URL(value); } catch { throw new Error("Zadejte platnou adresu včetně https://."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Zdroj musí být běžná webová adresa bez přihlašovacích údajů.");
    return url.href;
  }

  function updateDocument(document, values, editingId = null) {
    const next = JSON.parse(JSON.stringify(document));
    if (!Array.isArray(next.sources)) throw new Error("Seznam zdrojů má neplatný formát.");
    const original = editingId == null ? null : next.sources.find((s) => s.id === editingId);
    if (editingId != null && !original) throw new Error("Zdroj mezitím zmizel. Obnovte seznam.");
    const name = values.name.trim(), url = webUrl(values.url.trim(), true);
    if (!name) throw new Error("Vyplňte název zdroje.");
    if (next.sources.some((s) => s.id !== editingId && webUrl(s.url) === url)) throw new Error("Tato adresa už v seznamu je.");
    const filter = values.filter.trim();
    if (filter) { try { new RegExp(filter, "i"); } catch { throw new Error("Filtr není platný regulární výraz."); } }
    const source = { ...(original || {}), id: original ? original.id : Math.max(999, ...next.sources.map((s) => s.id)) + 1,
      name, url, lang: values.lang, type: values.type, region: values.region.trim(), note: values.note.trim(),
      enabled: values.enabled !== false, filter, listing: webUrl(values.listing.trim()), updated_at: new Date().toISOString() };
    const feedUrl = webUrl(values.feed.trim());
    const feeds = (original?.feeds || []).map((f) => ({ ...f }));
    if (feedUrl) {
      if (feeds.length) feeds[0] = { ...feeds[0], url: feedUrl, filter };
      else feeds.push({ url: feedUrl, filter });
    } else if (feeds.length) feeds.shift();
    source.feeds = feeds;
    if (original) next.sources[next.sources.findIndex((s) => s.id === original.id)] = source;
    else next.sources.push(source);
    return next;
  }
  function encodeDocument(document) {
    const bytes = new TextEncoder().encode(JSON.stringify(document, null, 2) + "\n");
    return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
  }
  return { webUrl, updateDocument, encodeDocument };
})();
