document.getElementById('checkDates').addEventListener('click', () => {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    alert('Please enter both start and end dates.');
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    alert('Start date cannot be after end date.');
    return;
  }

  const dates = [];
  for (let d = new Date(start.getTime()); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d.getTime())));
  }

  chrome.storage.local.set({ dates, results: [] }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('No active tab found.');
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: processDates,
        args: [dates]
      });
    });
  });
});

document.getElementById('clearResults').addEventListener('click', () => {
  chrome.storage.local.set({ results: [] }, () => {
    updatePopupTable([]);
  });
});

document.getElementById('loginToXfinity').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://login.xfinity.com/login' });
});

document.getElementById('outageCreditEligibility').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.error('No active tab found.');
      return;
    }
    chrome.tabs.update(tabs[0].id, { url: 'https://www.xfinity.com/support/account-management/credits/outage/details' });
  });
});

document.getElementById('helpButton').addEventListener('click', () => {
  document.getElementById('mainPage').style.display = 'none';
  document.getElementById('helpPage').style.display = 'block';
});

document.getElementById('goBackButton').addEventListener('click', () => {
  document.getElementById('helpPage').style.display = 'none';
  document.getElementById('mainPage').style.display = 'block';
});

function formatDate(date) {
  const day = (`0${date.getUTCDate()}`).slice(-2);
  const month = (`0${date.getUTCMonth() + 1}`).slice(-2);
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
}

function updatePopupTable(data) {
  const table = document.getElementById('resultsTable').querySelector('tbody');
  table.innerHTML = '';
  data.forEach(({ date, status }) => {
    const row = table.insertRow();
    const dateCell = row.insertCell(0);
    const statusCell = row.insertCell(1);
    dateCell.textContent = date;
    statusCell.textContent = status;
  });
}

function processDates(dates) {
  let currentIndex = 0;

  function createMouseEvent(type) {
    return new MouseEvent(type, {
      view: window,
      bubbles: true,
      cancelable: true
    });
  }

  function clickElement(element) {
    if (element) {
      element.dispatchEvent(createMouseEvent('mousedown'));
      element.dispatchEvent(createMouseEvent('mouseup'));
      element.dispatchEvent(createMouseEvent('click'));
    } else {
      console.error('Element not found for clicking');
    }
  }

  function focusAndSetDate(element, date) {
    if (element) {
      element.focus();
      element.value = date;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.error('Element not found for setting date');
    }
  }

  async function checkNextDate() {
    if (currentIndex >= dates.length) {
      alert('Date check completed');
      return;
    }

    const date = dates[currentIndex];
    console.log(`Processing date: ${date}`);

    const startDateElement = document.getElementById('startDate');
    if (!startDateElement) {
      console.error('Start date element not found');
      return;
    }
    clickElement(startDateElement);
    await new Promise(resolve => setTimeout(resolve, 500));
    focusAndSetDate(startDateElement, date);
    console.log(`Injected start date: ${date}`);

    const endDateElement = document.getElementById('endDate');
    if (!endDateElement) {
      console.error('End date element not found');
      return;
    }
    clickElement(endDateElement);
    await new Promise(resolve => setTimeout(resolve, 500));
    focusAndSetDate(endDateElement, date);
    console.log(`Injected end date: ${date}`);

    const continueButton = document.querySelector('button.button--primary[type="submit"]');
    if (!continueButton) {
      console.error('Continue button not found');
      return;
    }
    clickElement(continueButton);
    console.log('Clicked Continue button');

    await new Promise(resolve => setTimeout(resolve, 3000));
    const isIneligible = document.body.innerText.includes("isn't eligible for a credit");
    const status = isIneligible ? 'Not Eligible' : 'Eligible';

    chrome.storage.local.get('results', (data) => {
      let results = data.results || [];
      results = results.filter(item => item.date !== date);
      results.push({ date, status });

      chrome.storage.local.set({ results }, () => {
        updatePopupTable(results);
      });
      console.log(`Date ${date} is ${status}`);

      window.history.back();
      setTimeout(() => {
        currentIndex++;
        checkNextDate();
      }, 3000);
    });
  }

  checkNextDate();
}

chrome.storage.local.get('results', (data) => {
  updatePopupTable(data.results || []);
});