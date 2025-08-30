(function (sk) {
    const { createApp, reactive, onMounted, watch } = Vue;
    sk.toggleDebug = function () {
        document.querySelector("#debugData").classList.toggle("hide");
    }

    document.addEventListener('keydown', (e) => {
        // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            instance.print();
        }
    });


    let instance = createApp({
        setup: function () {
            const LOCAL_KEY = 'seller-data';
            const MINIMUM_PRICE = 2;
            const sellerData = reactive({
                sellerId: '',
                defaultDonation: false,
                selectAll: false,
                defaultGender: 'unmarked',
                items: []
            });

            function toggleSelectAll() {
                sellerData.items.forEach(item => {
                    item.selected = sellerData.selectAll;
                });
            }
            function checkAllToggled(index) {
                sellerData.selectAll = sellerData.items.every((e) => e.selected);
            }

            function addItem() {
                sellerData.items.push({
                    selected: false,
                    donation: sellerData.defaultDonation,
                    gender: sellerData.defaultGender,
                    itemDescription: '',
                    size: '',
                    price: MINIMUM_PRICE
                });
            }

            function removeItem(index) {
                if (confirm(`This will remove "${sellerData.items[index].itemDescription}" from the list. This action cannot be undone. Continue?`)) {
                    sellerData.items.splice(index, 1);
                }
                if (sellerData.items.length === 0) {
                    addItem();
                }
            }

            function print() {
                let sellerId = sellerData.sellerId,
                    itemCount = sellerData.items.length;

                if (!sellerId) {
                    alert("Please enter a seller ID.");
                    document.querySelector("#txtSellerId")?.focus();
                    return;
                }

                if (itemCount === 0) {
                    alert("There are no tags to print.");
                    return;
                }
                sellerData.selectAll = true;

                if (confirm(`You are about to print ${itemCount} tag${itemCount === 1 ? "" : "s"} for seller ID ${sellerId}. Do you want to continue?`)) {

                    window.print();
                    sellerData.selectAll = false;
                }
            }

            function validatePrice(item) {
                let corrected = false;
                let newPrice = Number(item.price);

                if (isNaN(newPrice) || newPrice < MINIMUM_PRICE) {
                    newPrice = MINIMUM_PRICE;
                    corrected = true;
                }

                if (!Number.isInteger(newPrice)) {
                    newPrice = Math.round(newPrice);
                    corrected = true;
                }

                item.price = newPrice;

                if (corrected) {
                    // restart animation
                    item.highlight = false;
                    void item; // force reactivity
                    item.highlight = true;

                    // remove highlight after full animation
                    setTimeout(() => {
                        item.highlight = false;
                    }, 5000); // matches total animation duration
                }
            }


            function saveToLocalStorage() {
                localStorage.setItem(LOCAL_KEY, JSON.stringify(sellerData));
            }

            function exportAsJSON() {
                const dataStr = JSON.stringify(sellerData, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'seller-data.json';
                link.click();
                URL.revokeObjectURL(url);
            }

            function clearAllItems() {
                if (confirm(`This will remove all ${sellerData.items.length} items from the list. This action cannot be undone. Continue?`)) {
                    sellerData.items.splice(0, sellerData.items.length);
                    addItem(); // optional: add a new empty row
                }
            }

            function removeSelected() {
                if (!sellerData.items.some(item => item.selected)) {
                    alert("No items selected to remove.");
                    return;
                }

                if (confirm(`This will remove all selected items. This action cannot be undone. Continue?`)) {
                    for (let i = sellerData.items.length - 1; i >= 0; i--) {
                        if (sellerData.items[i].selected) {
                            sellerData.items.splice(i, 1);
                        }
                    }
                    if (sellerData.items.length === 0) {
                        addItem(); // keep at least one blank row
                    }
                }
            }

            function importFromJSON(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);
                        Object.assign(sellerData, imported);
                        if (!sellerData.items.length) addItem();
                    } catch (err) {
                        alert(`Import failed: The JSON file is invalid.\n\nError: ${err.message}`);
                    }
                };
                reader.readAsText(file);
            }

            function drawBarcode(canvas, item) {
                if (!canvas)
                    return;
                const code = `${sellerData.sellerId}$${Number(item?.price || 0).toFixed(2)}`;
                try {
                    bwipjs.toCanvas(canvas, {
                        bcid: 'code93ext',
                        text: code,
                        scale: 1,
                        height: 15,
                        includetext: false,
                        includecheck: true
                    });
                } catch (e) {
                    console.error('Barcode error', e);
                }
            }

            onMounted(() => {
                const stored = localStorage.getItem(LOCAL_KEY);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);

                        // Remove temporary highlight flags
                        delete parsed.selectAll;
                        if (parsed.items && Array.isArray(parsed.items)) {
                            parsed.items.forEach(item => {
                                delete item.highlight
                                delete item.selected;
                            });
                        }

                        Object.assign(sellerData, parsed);

                        if (!sellerData.items.length) {
                            addItem();
                        }
                    } catch {
                        addItem();
                    }
                } else addItem();
            });

            watch(() => sellerData,
                saveToLocalStorage,
                { deep: true });

            return { sellerData, addItem, removeItem, clearAllItems, removeSelected, print, validatePrice, exportAsJSON, importFromJSON, drawBarcode, toggleSelectAll, checkAllToggled };
        }
    }).mount('#app');
})(window.sk = window.sk || {});