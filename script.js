window.addEventListener("DOMContentLoaded", function() {
    let titleText = document.getElementById("title-text");
    let titleLogo = document.getElementById("title-logo");
    
    if (!titleText || !titleLogo) {
        console.error("Error: 'title-text' or 'title-logo' elements not found.");
        return;
    }
    
    // Set transitions for smooth fading
    titleText.style.transition = "opacity 0.3s ease-in-out";
    titleLogo.style.transition = "opacity 0.3s ease-in-out";
    
    // Get the current page path
    let path = window.location.pathname;
    
    // Home page: Keep text visible, logo hidden.
    if (path.endsWith("index.html") || path === "/" || path === "") {
         titleText.style.opacity = "1";
         titleLogo.style.opacity = "0";
    }
    // Projects page: After 1 second, fade text out and fade in logo.
    else if (path.endsWith("projects.html")) {
         // Initially, text is visible.
         titleText.style.opacity = "1";
         titleLogo.style.opacity = "0";
         setTimeout(function(){
              titleText.style.opacity = "0";
              titleLogo.style.opacity = "1";
         }, 1000); // 1 second delay
    }
    // Portfolio page: Use scroll-triggered fade.
    else if (path.endsWith("portfolio.html")) {
         // Set initial state based on scroll position.
         if (window.scrollY > 50) {
              titleText.style.opacity = "0";
              titleLogo.style.opacity = "1";
         } else {
              titleText.style.opacity = "1";
              titleLogo.style.opacity = "0";
         }
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