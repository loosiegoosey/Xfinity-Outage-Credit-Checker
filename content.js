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
      element.dispatchEvent(createMouseEvent('mousedown'));
      element.dispatchEvent(createMouseEvent('mouseup'));
      element.dispatchEvent(createMouseEvent('click'));
    }

    function focusAndSetDate(element, date) {
      element.focus();
      element.value = date;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Click on start date element and inject date
    const startDateElement = document.getElementById('startDate');
    clickElement(startDateElement);
    setTimeout(() => {
      focusAndSetDate(startDateElement, date);

      // Click on end date element and inject date
      const endDateElement = document.getElementById('endDate');
      clickElement(endDateElement);
      setTimeout(() => {
        focusAndSetDate(endDateElement, date);

        // Click the Continue button
        const continueButton = document.querySelector('button.button--primary[type="submit"]');
        clickElement(continueButton);

        setTimeout(() => {
          const isIneligible = document.body.innerText.includes("isn't eligible for a credit at this time");
          sendResponse({ status: isIneligible ? 'Not Eligible' : 'Eligible' });
        }, 3000); // Wait for the new page to load and check for eligibility
      }, 500); // Wait for the end date element to be focused and value set
    }, 500); // Wait for the start date element to be focused and value set
  }
  return true; // Keeps the message channel open for sendResponse
});
