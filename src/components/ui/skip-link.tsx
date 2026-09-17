/**
 * Keyboard-only "Skip to main content" link. Visible on focus, it moves focus
 * into the first <main> landmark (adding a temporary tabindex) so keyboard and
 * screen-reader users can bypass navigation on every route.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(e) => {
        const main = document.querySelector<HTMLElement>("main");
        if (!main) return;
        e.preventDefault();
        main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView({ block: "start" });
      }}
    >
      Skip to main content
    </a>
  );
}
