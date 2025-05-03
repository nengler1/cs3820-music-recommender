const themeToggleBtn = document.getElementById('theme-toggle')

// flip the class and icon, persist in LocalStorage
const applyTheme = (theme) => {
  // toggle the class for styling
  document.documentElement.classList.toggle('dark-mode', theme === 'dark');

  // show sun icon in dark mode, else show moon
  document
    .getElementById('icon-sun')
    .style.display = theme === 'dark' ? 'inline-block' : 'none';
  document
    .getElementById('icon-moon')
    .style.display = theme === 'dark' ? 'none' : 'inline-block';
}

// on click, switch and save preference
themeToggleBtn.addEventListener('click', () => {
  const next = document.documentElement.classList.contains('dark-mode')
    ? 'light'
    : 'dark'
  applyTheme(next)
  localStorage.setItem('theme', next)
})

// on load, read saved theme (or default to light)
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'light'
  applyTheme(saved)
})
