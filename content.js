chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkDate') {
    const { date } = request;

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

    const startDateElement = document.getElementById('startDate');
    if (!startDateElement) {
      console.error('Start date element not found');
      sendResponse({ status: 'Error: Start date element not found' });
      return;
    }
    clickElement(startDateElement);
    setTimeout(() => {
      focusAndSetDate(startDateElement, date);

      const endDateElement = document.getElementById('endDate');
      if (!endDateElement) {
        console.error('End date element not found');
        sendResponse({ status: 'Error: End date element not found' });
        return;
      }
      clickElement(endDateElement);
      setTimeout(() => {
        focusAndSetDate(endDateElement, date);

        const continueButton = document.querySelector('button.button--primary[type="submit"]');
        if (!continueButton) {
          console.error('Continue button not found');
          sendResponse({ status: 'Error: Continue button not found' });
          return;
        }
        clickElement(continueButton);

        const observer = new MutationObserver((mutations, obs) => {
          const isIneligible = document.body.innerText.includes("isn't eligible for a credit at this time");
          const isEligible = document.body.innerText.includes("eligible for a credit");
          if (isIneligible || isEligible) {
            obs.disconnect();
            sendResponse({ status: isIneligible ? 'Not Eligible' : 'Eligible' });
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }, 500);
    }, 500);
  }
  return true;
});