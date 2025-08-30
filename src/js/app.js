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
            const MAX_PRICE = 100000;
            const sellerData = reactive({
                sellerId: '',
                defaultDonation: false,
                defaultSize: "",
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
                var item = {
                    selected: false,
                    donation: sellerData.defaultDonation,
                    gender: sellerData.defaultGender,
                    itemDescription: '',
                    size: sellerData.defaultSize,
                    price: 0
                };

                sellerData.items.push(attachItemMethods(item));
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
                var selectedIndexes = sellerData.items.map((val, i) => val.selected ? i : -1).filter(i => i !== -1);
                sellerData.selectAll = true;
                toggleSelectAll();

                return printSelected().then(() => {
                    sellerData.selectAll = false;
                    toggleSelectAll();

                    selectedIndexes.forEach(function (e) {
                        sellerData.items[e].selected = true;
                    });
                    checkAllToggled(0);
                });
            }

            function printSelected() {
                let sellerId = sellerData.sellerId,
                    itemCount = sellerData.items.filter(item => item.selected && item.isValid()).length,
                    retPromise = new Promise((resolve, reject) => {
                        if (!sellerId) {
                            alert("Please enter a seller ID.");
                            document.querySelector("#txtSellerId")?.focus();
                            reject(new Error("Missing seller ID"));
                            return;
                        }

                        if (itemCount === 0) {
                            alert("There are no valid tags to print.");
                            reject(new Error("No items selected"));
                            return;
                        }


                        if (confirm(`You are about to print ${itemCount} tag${itemCount === 1 ? "" : "s"} for seller ID ${sellerId}. Do you want to continue?`)) {
                            try {
                                setTimeout(() => {
                                    window.print();
                                    resolve();
                                }, 0);
                            }
                            catch (e) {
                                reject(err);
                            }
                        } else {
                            resolve();
                        }
                    });

                return retPromise;
            }

            function validatePrice(item) {
                let corrected = false;
                let newPrice = Number(item.price);

                if (isNaN(newPrice) || newPrice < 0) {
                    newPrice = 0;
                    corrected = true;
                }
                if (newPrice > MAX_PRICE) {
                    newPrice = MAX_PRICE;
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

            function attachItemMethods(item) {
                item.isValid = function () {
                    const currentPrice = Number(this.price);
                    return currentPrice > 0;
                };
                return item;
            }

            onMounted(() => {
                const stored = localStorage.getItem(LOCAL_KEY);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);

                        delete parsed.selectAll;
                        if (parsed.items && Array.isArray(parsed.items)) {
                            parsed.items = parsed.items.map(item => {
                                delete item.highlight;
                                delete item.selected;
                                return attachItemMethods(item);
                            });
                        }

                        Object.assign(sellerData, parsed);

                        if (!sellerData.items.length) addItem();
                    } catch {
                        addItem();
                    }
                } else addItem();
            });

            watch(() => sellerData,
                saveToLocalStorage,
                { deep: true });

            return { sellerData, addItem, removeItem, clearAllItems, removeSelected, print, printSelected, validatePrice, exportAsJSON, importFromJSON, drawBarcode, toggleSelectAll, checkAllToggled };
        }
    }).mount('#app');
})(window.sk = window.sk || {});