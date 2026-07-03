document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Sticky Header ---
  const header = document.querySelector('.header');
  const stickyScrollHeight = 50;

  window.addEventListener('scroll', () => {
    if (window.scrollY > stickyScrollHeight) {
      header.classList.add('header--sticky');
    } else {
      header.classList.remove('header--sticky');
    }
  });

  // --- 2. Smooth Scroll for Anchor Links ---
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // --- 3. Booking State Manager ---
  class BookingState {
    constructor() {
      this.selectedServices = [];
      this.master = null;
      this.date = null;
      this.timeSlot = null;
    }
    
    addService(id, name, price) {
      if (this.selectedServices.some(s => s.id === id)) return false;
      this.selectedServices.push({ id, name, price: Number(price) });
      this.saveToLocalStorage();
      return true;
    }
    
    removeService(id) {
      this.selectedServices = this.selectedServices.filter(s => s.id !== id);
      this.saveToLocalStorage();
    }
    
    getTotalPrice() {
      return this.selectedServices.reduce((sum, s) => sum + s.price, 0);
    }

    saveToLocalStorage() {
      localStorage.setItem('wabi_booking_draft', JSON.stringify({
        selectedServices: this.selectedServices,
        master: this.master,
        date: this.date,
        timeSlot: this.timeSlot
      }));
    }

    loadFromLocalStorage() {
      try {
        const draft = localStorage.getItem('wabi_booking_draft');
        if (draft) {
          const parsed = JSON.parse(draft);
          this.selectedServices = parsed.selectedServices || [];
          this.master = parsed.master || null;
          this.date = parsed.date || null;
          this.timeSlot = parsed.timeSlot || null;
        }
      } catch (e) {
        console.error('Failed to load booking draft', e);
      }
    }
  }

  window.bookingState = new BookingState();
  window.bookingState.loadFromLocalStorage();

  // --- 4. Services Tabs Switcher ---
  const tabButtons = document.querySelectorAll('.services__tab');
  const serviceCards = document.querySelectorAll('.service-card');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Toggle active class on tab buttons
      tabButtons.forEach(btn => btn.classList.remove('services__tab--active'));
      button.classList.add('services__tab--active');

      // Filter cards
      const category = button.getAttribute('data-category');
      serviceCards.forEach(card => {
        if (card.getAttribute('data-category') === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- 5. Global handler for Adding Services ---
  window.addServiceFromPrice = (button) => {
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');
    const price = parseInt(button.getAttribute('data-price'), 10);

    const added = window.bookingState.addService(id, name, price);
    if (added) {
      // Temporarily change button style
      const originalText = button.textContent;
      button.textContent = 'Добавлено ✓';
      button.style.backgroundColor = 'var(--text-primary)';
      button.style.color = 'var(--bg-primary)';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--text-primary)';
      }, 2000);

      // Trigger Booking Widget UI update (will be defined in Task 5)
      if (typeof window.updateBookingWidgetUI === 'function') {
        window.updateBookingWidgetUI();
      }

      // Smooth scroll to booking widget
      const bookingSection = document.querySelector('#booking');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // --- 6. Before/After Drag Slider ---
  const slider = document.querySelector('.ba-slider');
  if (slider) {
    const afterImg = slider.querySelector('.ba-slider__img--after');
    const handle = slider.querySelector('.ba-slider__handle');
    let isDragging = false;

    const moveSlider = (clientX) => {
      const rect = slider.getBoundingClientRect();
      const x = clientX - rect.left;
      let percentage = (x / rect.width) * 100;

      // Clamp between 0 and 100
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;

      // Update positions
      afterImg.style.width = percentage + '%';
      handle.style.left = percentage + '%';
    };

    // Mouse events
    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      moveSlider(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      moveSlider(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch events
    slider.addEventListener('touchstart', (e) => {
      isDragging = true;
      if (e.touches && e.touches[0]) {
        moveSlider(e.touches[0].clientX);
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      if (e.touches && e.touches[0]) {
        moveSlider(e.touches[0].clientX);
      }
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  // --- 7. Interactive Booking Widget UI & Logic ---
  
  // Validation method
  BookingState.prototype.validate = function(clientData) {
    if (this.selectedServices.length === 0) return { valid: false, error: "Услуги не выбраны. Выберите услуги из меню выше." };
    if (!this.master) return { valid: false, error: "Мастер не выбран." };
    if (!this.date || !this.timeSlot) return { valid: false, error: "Дата или время не выбраны." };
    if (!clientData || !clientData.name || clientData.name.trim().length < 2) {
      return { valid: false, error: "Введите корректное имя (минимум 2 символа)." };
    }
    const phoneRegex = /^\+?[78]\d{10}$/;
    if (!clientData.phone || !phoneRegex.test(clientData.phone.replace(/[\s()-]/g, ""))) {
      return { valid: false, error: "Некорректный номер телефона. Введите 11 цифр." };
    }
    return { valid: true };
  };

  // DOM Elements
  const bookingFlowWidget = document.getElementById('booking-flow-widget');
  const bookingActivePanel = document.getElementById('booking-active-panel');
  const selectedServicesList = document.getElementById('selected-services-list');
  const bookingStep1Total = document.getElementById('booking-step1-total');
  
  const btnNextToMaster = document.getElementById('btn-next-to-master');
  const btnNextToDatetime = document.getElementById('btn-next-to-datetime');
  const btnNextToContacts = document.getElementById('btn-next-to-contacts');
  
  const stepIndicators = document.querySelectorAll('.booking-step-indicator');
  const bookingSteps = document.querySelectorAll('.booking-widget__step');
  
  const clientNameInput = document.getElementById('client-name');
  const clientPhoneInput = document.getElementById('client-phone');
  const clientCommentInput = document.getElementById('client-comment');
  const validationErrorDiv = document.getElementById('booking-validation-error');
  
  // Calendar variables
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Update overall Booking UI
  window.updateBookingWidgetUI = () => {
    // 1. Check if there is an active confirmed booking in LocalStorage
    const activeBookingStr = localStorage.getItem('wabi_active_booking');
    if (activeBookingStr) {
      try {
        const booking = JSON.parse(activeBookingStr);
        document.getElementById('active-booking-services').textContent = booking.services.map(s => s.name).join(', ');
        document.getElementById('active-booking-master').textContent = booking.master;
        
        const dateObj = new Date(booking.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('active-booking-datetime').textContent = `${formattedDate} в ${booking.timeSlot}`;
        document.getElementById('active-booking-total').textContent = `${booking.total} ₽`;
        
        bookingActivePanel.style.display = 'block';
        bookingFlowWidget.style.display = 'none';
        return;
      } catch (e) {
        console.error('Error loading active booking', e);
      }
    }
    
    bookingActivePanel.style.display = 'none';
    bookingFlowWidget.style.display = 'block';

    // 2. Populate Step 1 Services
    selectedServicesList.innerHTML = '';
    const services = window.bookingState.selectedServices;
    
    if (services.length === 0) {
      selectedServicesList.innerHTML = '<p class="selected-services-list__empty">Вы еще не добавили ни одного ритуала. Выберите услуги выше в меню.</p>';
      bookingStep1Total.textContent = '0 ₽';
      btnNextToMaster.disabled = true;
    } else {
      services.forEach(service => {
        const item = document.createElement('div');
        item.className = 'selected-service-item';
        item.innerHTML = `
          <span class="selected-service-item__name">${service.name}</span>
          <span class="selected-service-item__price">${service.price.toLocaleString('ru-RU')} ₽</span>
          <button class="selected-service-item__remove" onclick="removeServiceFromWidget('${service.id}')">Удалить</button>
        `;
        selectedServicesList.appendChild(item);
      });
      bookingStep1Total.textContent = `${window.bookingState.getTotalPrice().toLocaleString('ru-RU')} ₽`;
      btnNextToMaster.disabled = false;
    }
    
    // 3. Sync Next Buttons states
    btnNextToDatetime.disabled = !window.bookingState.master;
    btnNextToContacts.disabled = !(window.bookingState.date && window.bookingState.timeSlot);
    
    // 4. Update calendar selection styling
    renderCalendar();
    renderTimeSlots();
  };

  // Remove service from widget helper
  window.removeServiceFromWidget = (id) => {
    window.bookingState.removeService(id);
    window.updateBookingWidgetUI();
  };

  // Step navigation helper
  window.goToStep = (stepNumber) => {
    // Basic navigation constraints
    if (stepNumber === 2 && window.bookingState.selectedServices.length === 0) return;
    if (stepNumber === 3 && !window.bookingState.master) return;
    if (stepNumber === 4 && (!window.bookingState.date || !window.bookingState.timeSlot)) return;

    stepIndicators.forEach(ind => {
      const stepIdx = parseInt(ind.getAttribute('data-step'), 10);
      ind.classList.remove('booking-step-indicator--active', 'booking-step-indicator--completed');
      if (stepIdx === stepNumber) {
        ind.classList.add('booking-step-indicator--active');
      } else if (stepIdx < stepNumber) {
        ind.classList.add('booking-step-indicator--completed');
      }
    });

    bookingSteps.forEach(step => {
      step.classList.remove('booking-widget__step--active');
      if (parseInt(step.getAttribute('data-step'), 10) === stepNumber) {
        step.classList.add('booking-widget__step--active');
      }
    });
    
    validationErrorDiv.style.display = 'none';
  };

  // Master Selection Handler
  window.selectMaster = (masterName) => {
    window.bookingState.master = masterName;
    window.bookingState.saveToLocalStorage();
    btnNextToDatetime.disabled = false;
  };

  // Calendar render function
  function renderCalendar() {
    const monthYearSpan = document.getElementById('calendar-month-year');
    const daysGrid = document.getElementById('calendar-days-grid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = '';
    monthYearSpan.textContent = `${monthNamesRu[calMonth]} ${calYear}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Day of the week offset (Monday-based)
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const firstDayMonday = firstDay === 0 ? 6 : firstDay - 1;

    // Total days in month
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();

    // Render empty spaces
    for (let i = 0; i < firstDayMonday; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day calendar-day--empty';
      daysGrid.appendChild(emptyDay);
    }

    // Render calendar days
    for (let day = 1; day <= totalDays; day++) {
      const currentCellDate = new Date(calYear, calMonth, day);
      const isPast = currentCellDate < today;
      const isToday = currentCellDate.getTime() === today.getTime();

      const dayBtn = document.createElement('div');
      dayBtn.className = 'calendar-day';
      dayBtn.textContent = day;

      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (isPast) {
        dayBtn.classList.add('calendar-day--disabled');
      } else {
        if (isToday) dayBtn.classList.add('calendar-day--today');
        if (window.bookingState.date === dateStr) {
          dayBtn.classList.add('calendar-day--selected');
        }

        dayBtn.addEventListener('click', () => {
          // Select date
          window.bookingState.date = dateStr;
          window.bookingState.timeSlot = null; // reset slot on date change
          window.bookingState.saveToLocalStorage();
          window.updateBookingWidgetUI();
        });
      }

      daysGrid.appendChild(dayBtn);
    }
  }

  // Month Navigation
  window.prevMonth = () => {
    const today = new Date();
    if (calYear > today.getFullYear() || (calYear === today.getFullYear() && calMonth > today.getMonth())) {
      calMonth--;
      if (calMonth < 0) {
        calMonth = 11;
        calYear--;
      }
      renderCalendar();
    }
  };

  window.nextMonth = () => {
    calMonth++;
    if (calMonth > 11) {
      calMonth = 0;
      calYear++;
    }
    renderCalendar();
  };

  // Render Time Slots
  function renderTimeSlots() {
    const slotsGrid = document.getElementById('time-slots-grid');
    const slotsHintMsg = document.getElementById('slots-hint-msg');
    const selectedDateLabel = document.getElementById('selected-date-label');
    
    if (!slotsGrid) return;
    
    const timeSlots = slotsGrid.querySelectorAll('.time-slot');

    if (!window.bookingState.date) {
      slotsGrid.style.display = 'none';
      slotsHintMsg.style.display = 'block';
      selectedDateLabel.textContent = 'Выберите дату:';
      return;
    }

    slotsGrid.style.display = 'grid';
    slotsHintMsg.style.display = 'none';
    
    const parsedDate = new Date(window.bookingState.date);
    const formattedDate = parsedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    selectedDateLabel.textContent = `Свободно на ${formattedDate}:`;

    // Reset slot styling and set active class
    timeSlots.forEach(slot => {
      const slotVal = slot.textContent.trim();
      slot.className = 'time-slot';
      
      // Simulate booking block for past time if selected today
      const today = new Date();
      if (parsedDate.toDateString() === today.toDateString()) {
        const [hours, minutes] = slotVal.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        if (slotTime < new Date()) {
          slot.classList.add('time-slot--disabled');
          return;
        }
      }

      if (window.bookingState.timeSlot === slotVal) {
        slot.classList.add('time-slot--selected');
      }
    });
  }

  // Time Slot Click Handler
  window.selectTimeSlot = (timeVal) => {
    // Check if slot is disabled (for today past hours)
    const today = new Date();
    if (window.bookingState.date) {
      const parsedDate = new Date(window.bookingState.date);
      if (parsedDate.toDateString() === today.toDateString()) {
        const [hours, minutes] = timeVal.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        if (slotTime < new Date()) return;
      }
    }

    window.bookingState.timeSlot = timeVal;
    window.bookingState.saveToLocalStorage();
    window.updateBookingWidgetUI();
  };

  // Submit Booking Handler
  window.submitBooking = (event) => {
    event.preventDefault();
    
    const clientData = {
      name: clientNameInput.value,
      phone: clientPhoneInput.value,
      comment: clientCommentInput.value
    };

    const validationResult = window.bookingState.validate(clientData);
    if (!validationResult.valid) {
      validationErrorDiv.textContent = validationResult.error;
      validationErrorDiv.style.display = 'block';
      return;
    }

    // Success - Save confirmed booking
    const confirmedBooking = {
      services: window.bookingState.selectedServices,
      master: window.bookingState.master,
      date: window.bookingState.date,
      timeSlot: window.bookingState.timeSlot,
      client: clientData,
      total: window.bookingState.getTotalPrice()
    };

    localStorage.setItem('wabi_active_booking', JSON.stringify(confirmedBooking));
    
    // Clear draft
    window.bookingState.selectedServices = [];
    window.bookingState.master = null;
    window.bookingState.date = null;
    window.bookingState.timeSlot = null;
    window.bookingState.saveToLocalStorage();
    
    // Reset form fields
    clientNameInput.value = '';
    clientPhoneInput.value = '';
    clientCommentInput.value = '';
    
    // Sync UI
    window.updateBookingWidgetUI();
    goToStep(1); // Reset widget step indicators silently for next time
  };

  // Cancel Confirmed Booking
  window.cancelCurrentBooking = () => {
    if (confirm('Вы уверены, что хотите отменить эту запись?')) {
      localStorage.removeItem('wabi_active_booking');
      window.updateBookingWidgetUI();
    }
  };

  // Initialize UI
  window.updateBookingWidgetUI();
});