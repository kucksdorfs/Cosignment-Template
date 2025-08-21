(function (sk) {
    const { createApp, reactive, onMounted, watch } = Vue;
    sk.toggleDebug = function () {
        document.querySelector("#debugData").classList.toggle("hide");
    }

    document.addEventListener('keydown', (e) => {
        // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();  // stop the default print dialog
            instance.print();
            //alert("Custom print handler here!");
            // You can call your own print function, e.g., window.print() or something custom
        }
    });


    let instance = createApp({
        setup: function () {
            const LOCAL_KEY = 'seller-data';
            const MINIMUM_PRICE = 2;
            const sellerData = reactive({
                sellerId: '',
                defaultDonation: false,
                defaultGender: 'unmarked',
                items: []
            });

            function addItem() {
                sellerData.items.push({
                    donation: sellerData.defaultDonation,
                    gender: sellerData.defaultGender,
                    itemDescription: '',
                    size: '',
                    price: MINIMUM_PRICE
                });
            }

            function removeItem(index) {
                sellerData.items.splice(index, 1);
            }

            function print() {
                let sellerId = sellerData.sellerId,
                    itemCount = sellerData.items.length;

                if (!sellerId) {
                    alert("Please enter your seller id.");
                    document.querySelector("#txtSellerId")?.focus();
                    return;
                }

                if (itemCount === 0) {
                    alert("You have no tags to print.");
                    return;
                }

                if (confirm(`You are about to print ${itemCount} tags for seller ID ${sellerId}. Do you want to continue?`)) {
                    window.print();
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
                sellerData.items.splice(0, sellerData.items.length);
                addItem(); // optional: add a new empty row
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
                        alert('Invalid JSON file');
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
                        if (parsed.items && Array.isArray(parsed.items)) {
                            parsed.items.forEach(item => delete item.highlight);
                        }

                        Object.assign(sellerData, parsed);

                        if (!sellerData.items.length) addItem();
                    } catch {
                        addItem();
                    }
                } else addItem();
            });

            watch(() => sellerData, saveToLocalStorage, { deep: true });

            return { sellerData, addItem, removeItem, clearAllItems, print, validatePrice, exportAsJSON, importFromJSON, drawBarcode };
        }
    }).mount('#app');
})(window.sk = window.sk || {});