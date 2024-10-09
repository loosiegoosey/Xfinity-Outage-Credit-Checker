chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkDates') {
    chrome.storage.local.get(['dates', 'results'], (data) => {
      const { dates } = data;
      if (dates && dates.length > 0) {
        checkDate(dates, 0);
      } else {
        console.error('No dates found in storage.');
      }
    });
  } else if (request.action === 'updatePopupTable') {
    chrome.storage.local.get('results', (data) => {
      const results = data.results || [];
      results.push({ date: request.date, status: request.status });
      chrome.storage.local.set({ results }, () => {
        // Send a message to the popup script to update the table
        chrome.runtime.sendMessage({ action: 'updatePopupTable', date: request.date, status: request.status });
      });
    });
  }
});

function checkDate(dates, index) {
  if (index >= dates.length) {
    chrome.storage.local.get('results', (data) => {
      chrome.runtime.sendMessage({ action: 'updatePopup', results: data.results });
    });
    return;
  }

  const date = dates[index];
  chrome.tabs.create({ url: 'https://www.xfinity.com/support/account-management/credits/outage/details' }, (tab) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: fillAndSubmitForm,
            args: [date]
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              chrome.tabs.remove(tab.id);
              return;
            }

            const [result] = results;
            if (result && result.result) {
              const { status } = result.result;

              chrome.storage.local.get('results', (data) => {
                const results = data.results || [];
                results.push({ date, status });
                chrome.storage.local.set({ results }, () => {
                  chrome.tabs.remove(tab.id, () => {
                    checkDate(dates, index + 1);
                  });
                });
              });
            } else {
              console.error('Error: No result returned from executed script.');
              chrome.tabs.remove(tab.id);
            }
          }
        );
      }
    });
  });
}

function fillAndSubmitForm(date) {
  const startDateElement = document.getElementById('startDate');
  const endDateElement = document.getElementById('endDate');
  const submitButton = document.querySelector('button[control-id="ControlID-5"]');

  if (!startDateElement || !endDateElement || !submitButton) {
    return { status: 'Form Elements Not Found' };
  }

  startDateElement.value = date;
  endDateElement.value = date;
  submitButton.click();

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body.innerText.includes("isn't eligible for a credit at this time")) {
        observer.disconnect();
        resolve({ status: 'Not Eligible' });
      } else if (document.body.innerText.includes("eligible for a credit")) {
        observer.disconnect();
        resolve({ status: 'Eligible' });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}