const assert = (condition, message) => {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
};

console.log("Starting tests...");

// booking state manager logic under test
class BookingState {
  constructor() {
    this.selectedServices = [];
    this.master = null;
    this.date = null;
    this.timeSlot = null;
  }
  
  addService(id, name, price) {
    if (this.selectedServices.some(s => s.id === id)) return false;
    this.selectedServices.push({ id, name, price });
    return true;
  }
  
  removeService(id) {
    this.selectedServices = this.selectedServices.filter(s => s.id !== id);
  }
  
  getTotalPrice() {
    return this.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }
}

// Assertions for BookingState
const state = new BookingState();
assert(state.addService("s1", "Японский маникюр Masura", 2400) === true, "Service s1 added successfully");
assert(state.selectedServices.length === 1, "State has 1 service");
assert(state.getTotalPrice() === 2400, "Total price is 2400");
assert(state.addService("s1", "Японский маникюр Masura", 2400) === false, "Duplicate service s1 not added");
assert(state.addService("s2", "Минеральное запечатывание", 1800) === true, "Service s2 added successfully");
assert(state.selectedServices.length === 2, "State has 2 services");
assert(state.getTotalPrice() === 4200, "Total price is 4200 (2400 + 1800)");

state.removeService("s1");
assert(state.selectedServices.length === 1, "Service s1 removed successfully");
assert(state.getTotalPrice() === 1800, "Total price updated to 1800 after removal");

// Extend BookingState with validation method (to replicate in script.js)
BookingState.prototype.validate = function(clientData) {
  if (this.selectedServices.length === 0) return { valid: false, error: "Услуги не выбраны" };
  if (!this.master) return { valid: false, error: "Мастер не выбран" };
  if (!this.date || !this.timeSlot) return { valid: false, error: "Дата или время не выбраны" };
  if (!clientData || !clientData.name || clientData.name.trim().length < 2) {
    return { valid: false, error: "Введите корректное имя" };
  }
  const phoneRegex = /^\+?[78]\d{10}$/;
  if (!clientData.phone || !phoneRegex.test(clientData.phone.replace(/[\s()-]/g, ""))) {
    return { valid: false, error: "Некорректный номер телефона" };
  }
  return { valid: true };
};

// Validation tests
const stateVal = new BookingState();
assert(stateVal.validate({ name: "Иван", phone: "+79991234567" }).valid === false, "Validation fails when services are empty");

stateVal.addService("s2", "Минеральное запечатывание", 1800);
assert(stateVal.validate({ name: "Иван", phone: "+79991234567" }).valid === false, "Validation fails when master is empty");

stateVal.master = "Харуто";
assert(stateVal.validate({ name: "Иван", phone: "+79991234567" }).valid === false, "Validation fails when date/time are empty");

stateVal.date = "2026-07-15";
stateVal.timeSlot = "14:00";
assert(stateVal.validate({ name: "", phone: "123" }).valid === false, "Validation fails when name is empty/phone is invalid");
assert(stateVal.validate({ name: "И", phone: "+79991234567" }).valid === false, "Validation fails when name is too short");
assert(stateVal.validate({ name: "Иван", phone: "89991234567" }).valid === true, "Validation passes with correct details and 8-prefixed phone");
assert(stateVal.validate({ name: "Иван", phone: "+7 (999) 123-45-67" }).valid === true, "Validation passes with formatted phone number");
