chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkDates') {
    chrome.storage.local.get(['dates', 'results'], (data) => {
      const { dates } = data;
      checkDate(dates, 0);
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
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: fillAndSubmitForm,
        args: [date]
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }

        const [result] = results;
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
      }
    );
  });
}

function fillAndSubmitForm(date) {
  document.getElementById('startDate').value = date;
  document.getElementById('endDate').value = date;
  document.querySelector('button[control-id="ControlID-5"]').click();

  return new Promise((resolve) => {
    setTimeout(() => {
      const status = document.body.innerText.includes("isn't eligible for a credit at this time") ? 'Not Eligible' : 'Eligible';
      resolve({ status });
    }, 3000); // Adjust timeout as needed
  });
}
