window.addEventListener("DOMContentLoaded", function() {
    let titleText = document.getElementById("title-text");
    let titleLogo = document.getElementById("title-logo");
    
    if (!titleText || !titleLogo) {
      console.error("Error: 'title-text' or 'title-logo' elements not found.");
      return;
    }
    
    // Get current page
    const path = window.location.pathname;
  
    // 1) HOME PAGE (index.html) -> No fade. Keep text only.
    if (path.endsWith("index.html") || path === "/" || path === "") {
      titleText.style.opacity = "1";
      titleLogo.style.opacity = "0";
    }
  
    // 2) PROJECTS PAGE -> Show text for 1 second, then fade to logo.
    else if (path.endsWith("projects.html")) {
      // Start with text visible
      titleText.style.opacity = "1";
      titleLogo.style.opacity = "0";
  
      setTimeout(() => {
        titleText.style.opacity = "0";
        titleLogo.style.opacity = "1";
      }, 1000); // 1 second delay
    }
  
    // 3) PORTFOLIO PAGE -> Scroll-triggered fade.
    else if (path.endsWith("portfolio.html")) {
      // Check initial scroll position
      if (window.scrollY > 50) {
        titleText.style.opacity = "0";
        titleLogo.style.opacity = "1";
      } else {
        titleText.style.opacity = "1";
        titleLogo.style.opacity = "0";
      }
      // On scroll
      window.addEventListener("scroll", function() {
        if (window.scrollY > 50) {
          titleText.style.opacity = "0";
          titleLogo.style.opacity = "1";
        } else {
          titleText.style.opacity = "1";
          titleLogo.style.opacity = "0";
        }
      });
    }
  });