(function () {
    const { createApp, reactive, onMounted, watch } = Vue;

    createApp({
        setup() {
            const LOCAL_KEY = 'seller-data';
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
                    price: 2
                });
            }

            function removeItem(index) {
                sellerData.items.splice(index, 1);
            }

            function validatePrice(item) {
                if (item.price < 2)
                    item.price = 2;
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
                const code = `${sellerData.sellerId}$${item.price.toFixed(2)}`;
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

            return { sellerData, addItem, removeItem, validatePrice, saveToLocalStorage, exportAsJSON, importFromJSON, drawBarcode };
        }
    }).mount('#app');
})();