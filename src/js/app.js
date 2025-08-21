(function (sk) {
    const { createApp, reactive, onMounted, watch } = Vue;
    sk.toggleDebug = function() {
        document.querySelector("#debugData").classList.toggle("hide");
    }

    createApp({
        setup: function() {
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
                var newPrice = item.price;
                if (!Number.isInteger(newPrice)) {
                    item.price = MINIMUM_PRICE;
                }
                
                if (item.price < MINIMUM_PRICE) {
                    item.price = MINIMUM_PRICE;
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
                if (!canvas) return;
                const code = `${sellerData.sellerId}$${item.price?.toFixed(2)}`;
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
                        Object.assign(sellerData, JSON.parse(stored));
                        if (!sellerData.items.length) addItem();
                    } catch {
                        addItem();
                    }
                } else addItem();
            });

            watch(() => sellerData, saveToLocalStorage, { deep: true });

            return { sellerData, addItem, removeItem, print, validatePrice, saveToLocalStorage, exportAsJSON, importFromJSON, drawBarcode };
        }
    }).mount('#app');
})(window.sk = window.sk || {});