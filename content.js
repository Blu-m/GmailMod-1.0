// Global array to store scraped subscription data references
let scrapedSubscriptions = [];

function scrapeSubscriptionData() {
    scrapedSubscriptions = []; // Clear previous tracking state
    
    // Target the table row nodes that Gmail explicitly uses for subscription lists
    const itemRows = document.querySelectorAll('tr[data-row-id]');

    itemRows.forEach((row, index) => {
        const emailIdentifier = row.getAttribute('data-row-id');
        if (!emailIdentifier || !emailIdentifier.includes('@')) return;

        // Find Gmail's native internal unsubscribe button trigger inside this specific row
        const nativeUnsubBtn = Array.from(row.querySelectorAll('div, span, button, p'))
                                    .find(el => el.textContent.trim() === 'Unsubscribe');

        if (!nativeUnsubBtn) return;

        // Scrape presentation text details safely from the current row context
        const rowText = row.textContent || "";
        let providerName = rowText.split(emailIdentifier)[0].replace('Unsubscribe', '').trim();
        if (providerName.length > 30) providerName = providerName.substring(0, 30) + "...";
        if (!providerName) providerName = "Email Sender";

        // Scrape Logo / Avatar rendering markup
        let logoHtml = '';
        const nativeImg = row.querySelector('img');
        
        if (nativeImg && nativeImg.src) {
            logoHtml = `<img src="${nativeImg.src}" class="modal-sub-logo-img">`;
        } else {
            const avatarContainer = Array.from(row.querySelectorAll('div, span')).find(el => {
                const text = el.textContent.trim();
                return text.length === 1 && el.clientWidth > 0 && el.clientHeight > 0;
            });

            if (avatarContainer) {
                const computedStyle = window.getComputedStyle(avatarContainer);
                const bgCol = computedStyle.backgroundColor || '#1a73e8';
                const txtCol = computedStyle.color || '#ffffff';
                logoHtml = `<div class="modal-sub-logo-avatar" style="background-color: ${bgCol}; color: ${txtCol};">${avatarContainer.textContent.trim()}</div>`;
            } else {
                logoHtml = `<div class="modal-sub-logo-avatar" style="background-color: #5f6368; color: #ffffff;">${providerName.charAt(0).toUpperCase()}</div>`;
            }
        }

        // Push clean schema object with persistent references to the row elements
        scrapedSubscriptions.push({
            id: `sub-item-${index}`,
            name: providerName,
            email: emailIdentifier,
            logoHtml: logoHtml,
            nativeRowElement: row,
            nativeButtonRef: nativeUnsubBtn
        });
    });

    console.log(`Subscription Manager: Scraped ${scrapedSubscriptions.length} unique table rows matching identifier metrics.`);
}

function openSubscriptionModal() {
    scrapeSubscriptionData();

    if (scrapedSubscriptions.length === 0) {
        alert("No active subscription rows found to manage.");
        return;
    }

    document.body.style.overflow = 'hidden';

    const backdrop = document.createElement('div');
    backdrop.id = 'sub-modal-backdrop';

    backdrop.innerHTML = `
        <div id="sub-modal-window">
            <div id="sub-modal-header">
                <h2>Manage Subscriptions</h2>
                <button id="sub-modal-close-btn">&times;</button>
            </div>
            <div id="sub-modal-body">
                <div id="sub-modal-list-container">
                    ${scrapedSubscriptions.map(sub => `
                        <div class="modal-sub-row" id="modal-row-id-${sub.id}">
                            <input type="checkbox" class="modal-item-checkbox" data-id="${sub.id}">
                            <div class="modal-sub-logo-wrapper">
                                ${sub.logoHtml}
                            </div>
                            <div class="modal-sub-details">
                                <span class="modal-sub-name">${sub.name}</span>
                                <span class="modal-sub-email">${sub.email}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div id="sub-modal-footer">
                <div class="footer-left-actions">
                    <button id="modal-action-select-all" class="sub-btn secondary-btn">Select All</button>
                    <button id="modal-action-clear" class="sub-btn secondary-btn">Clear Selection</button>
                </div>
                <button id="modal-action-unsubscribe" class="sub-btn bulk-danger-btn">Unsubscribe Selected</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    // Event Bindings
    document.getElementById('sub-modal-close-btn').addEventListener('click', closeSubscriptionModal);
    document.getElementById('modal-action-select-all').addEventListener('click', () => toggleModalCheckboxes(true));
    document.getElementById('modal-action-clear').addEventListener('click', () => toggleModalCheckboxes(false));
    document.getElementById('modal-action-unsubscribe').addEventListener('click', processModalUnsubscribes);
    
    backdrop.addEventListener('click', (e) => {
        if (e.target.id === 'sub-modal-backdrop') closeSubscriptionModal();
    });
}

function closeSubscriptionModal() {
    const backdrop = document.getElementById('sub-modal-backdrop');
    if (backdrop) backdrop.remove();
    document.body.style.overflow = '';
}

function toggleModalCheckboxes(selectActive) {
    const checkboxes = document.querySelectorAll('.modal-item-checkbox');
    checkboxes.forEach(box => box.checked = selectActive);
}

function processModalUnsubscribes() {
    const checkedBoxes = Array.from(document.querySelectorAll('.modal-item-checkbox:checked'));

    if (checkedBoxes.length === 0) {
        alert("Please select at least one item to process.");
        return;
    }

    if (confirm(`Trigger unsubscribe sequences for ${checkedBoxes.length} selected senders?`)) {
        checkedBoxes.forEach((box, index) => {
            const subId = box.getAttribute('data-id');
            const targetSub = scrapedSubscriptions.find(s => s.id === subId);

            if (targetSub) {
                setTimeout(() => {
                    console.log(`Processing removal sequence for target: ${targetSub.email}`);
                    
                    // 1. Attempt to fire the native button click
                    if (targetSub.nativeButtonRef) {
                        const btn = targetSub.nativeButtonRef;
                        btn.addEventListener('click', (e) => e.stopPropagation(), { once: true });
                        btn.click();
                    }
                    
                    // 2. FORCE VISUAL REMOVAL: Strip the row completely from Gmail's live DOM page background
                    if (targetSub.nativeRowElement) {
                        // Apply a smooth fade out transition
                        targetSub.nativeRowElement.style.transition = 'all 0.3s ease-out';
                        targetSub.nativeRowElement.style.opacity = '0';
                        targetSub.nativeRowElement.style.transform = 'translateX(-20px)';
                        
                        // Physically delete the table row element node after the fade finishes
                        setTimeout(() => {
                            targetSub.nativeRowElement.remove();
                        }, 300);
                    }
                    
                    // 3. Mark the row inside your open modal window as complete
                    const modalRow = document.getElementById(`modal-row-id-${subId}`);
                    if (modalRow) {
                        modalRow.style.opacity = '0.3';
                        modalRow.style.textDecoration = 'line-through';
                    }
                }, index * 150); 
            }
        });

        // Close modal safely after all UI modifications complete
        setTimeout(() => {
            closeSubscriptionModal();
            alert(`Successfully processed and removed ${checkedBoxes.length} providers from your active view layer!`);
        }, checkedBoxes.length * 150 + 400);
    }
}

function injectModifyButton() {
    if (document.getElementById('gmail-sub-manager-modify-trigger')) return;

    const elements = Array.from(document.querySelectorAll('h1, h2, div, span'));
    const titleHeader = elements.find(el => el.childNodes.length === 1 && el.textContent.trim() === 'Subscriptions');

    if (!titleHeader) return;

    const modifyBtn = document.createElement('button');
    modifyBtn.id = 'gmail-sub-manager-modify-trigger';
    modifyBtn.className = 'sub-btn primary-modify-btn';
    modifyBtn.textContent = 'Modify';

    titleHeader.insertAdjacentElement('afterend', modifyBtn);
    modifyBtn.addEventListener('click', openSubscriptionModal);
}

function monitorSettingsView() {
    injectModifyButton();
}

let scanTimeout;
const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(monitorSettingsView, 350);
});

observer.observe(document.body, { childList: true, subtree: true });
monitorSettingsView();