export function ThemeScript() {
  const script = `
    (function () {
      try {
        var key = 'hoosfinds-theme';
        var stored = window.localStorage.getItem(key);
        var theme = stored === 'light' || stored === 'dark'
          ? stored
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
