/* ============================================================
   INTERACTION LOGIC
   - Theme toggle (light / dark)
   - Name ↔ signature hover animation (UPDATED)
   - Repo-style folder expand / collapse
   - Continuous color spectrum across folder tree
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     THEME TOGGLE (LIGHT / DARK)
     - persists via localStorage
     - defaults to system preference
  ============================================================ */

  const root = document.documentElement;
  const storedTheme = localStorage.getItem("theme");

  if (storedTheme) {
    root.setAttribute("data-theme", storedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.setAttribute("data-theme", "light");
  }

  // Create toggle button (injected into nav)
  const toggle = document.createElement("button");
  toggle.id = "theme-toggle";
  toggle.textContent = "◐";
  toggle.setAttribute("aria-label", "Toggle dark mode");

  const nav = document.querySelector("#menu-bar nav");
  if (nav) nav.appendChild(toggle);

  toggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

/* ============================================================
     SEMANTIC COLOR INJECTOR
     Matches folder names to the brand palette classes
  ============================================================ */
  
  const semanticColors = {
    "harvard": "color-harvard",
    "divinity": "color-harvard",
    "rapoport": "color-rapoport",
    "dartmouth": "color-dartmouth",
    "chernik": "color-chernik",
    "openai": "color-openai",
    "penn": "color-penn",
    "chatlab": "color-penn",
    "greene": "color-greene",
    "middlebury": "color-middlebury",
    "interlochen": "color-interlochen",
    "compass": "color-compass"
  };

  const allLabels = document.querySelectorAll(".folder-label, .file-label");

  allLabels.forEach(label => {
    // Normalize text: lowercase, remove slashes
    const txt = label.textContent.toLowerCase().replace(/\/$/, "");

    // Find a matching key
    for (const [key, cssClass] of Object.entries(semanticColors)) {
      if (txt.includes(key)) {
        label.classList.add(cssClass);
        break; 
      }
    }
  });

  /* ============================================================
     NAME ↔ SIGNATURE HOVER (MODIFIED)
     - Light Mode: No change (stays signature)
     - Dark Mode: Hover turns signature Blue
  ============================================================ */

  const titleText = document.getElementById("title-text");
  const titleLogo = document.getElementById("title-logo");

  // EDIT THIS: Set this to the exact Blue hex code of your portfolio/toggle
  const HOVER_BLUE = "#2979ff"; 

  if (titleText && titleLogo) {
    // 1. Initial State: Hide text completely, show logo
    titleText.style.display = "none"; 
    titleText.style.opacity = "0";
    titleLogo.style.opacity = "1";
    
    // Add a transition to the logo for smooth color changing
    titleLogo.style.transition = "color 0.3s ease, fill 0.3s ease, stroke 0.3s ease";

    const setBlue = () => {
      // Only change color if we are in Dark Mode
      const currentTheme = root.getAttribute("data-theme");
      if (currentTheme === "dark") {
        titleLogo.style.color = HOVER_BLUE;
        titleLogo.style.fill = HOVER_BLUE;
        
        // If the logo is complex SVG paths, target them specifically
        const paths = titleLogo.querySelectorAll("path, circle, rect, polygon");
        paths.forEach(p => {
            p.style.fill = HOVER_BLUE;
            p.style.stroke = HOVER_BLUE;
        });
      }
    };

    const resetColor = () => {
      // Clear inline styles to revert to CSS defaults (white/black)
      titleLogo.style.color = "";
      titleLogo.style.fill = "";
      
      const paths = titleLogo.querySelectorAll("path, circle, rect, polygon");
      paths.forEach(p => {
          p.style.fill = "";
          p.style.stroke = "";
      });
    };

    // Apply listeners only to the logo
    titleLogo.addEventListener("mouseenter", setBlue);
    titleLogo.addEventListener("mouseleave", resetColor);
  }

  /* ============================================================
     CONTINUOUS COLOR SPECTRUM ACROSS FOLDER TREE
     - depth-first, visual order
  ============================================================ */

  const folders = Array.from(
    document.querySelectorAll("#portfolio .folder[data-folder]")
  );

  if (folders.length > 1) {
    const HUE_START = 0;     // red
    const HUE_END   = 270;   // violet
    const total = folders.length - 1;

    folders.forEach((folder, index) => {
      const t = index / total;
      const hue = HUE_START + t * (HUE_END - HUE_START);

      folder.style.setProperty(
        "--folder-accent",
        `hsl(${hue}, 70%, 55%)`
      );
    });
  }

  /* ============================================================
     REPO TREE: FOLDER / FILE TOGGLE
  ============================================================ */

  const toggles = document.querySelectorAll(
    "[data-folder] > h3 > button," +
    "[data-folder] > h4 > button," +
    "[data-folder] > h5 > button," +
    ".file > h5 > button"
  );

  toggles.forEach(button => {
    button.addEventListener("click", () => {
      const node = button.closest(".folder, .file");
      if (!node) return;

      const content = node.querySelector(
        ".folder-content, .file-content"
      );

      if (!content) return;

      content.classList.toggle("open");
    });
  });

});