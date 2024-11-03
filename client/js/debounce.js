// https://www.freecodecamp.org/news/javascript-debounce-example/
const debounce = (fn, wait) => {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};