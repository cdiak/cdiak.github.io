window.addEventListener("DOMContentLoaded", function() {
    let titleText = document.getElementById("title-text");
    let titleLogo = document.getElementById("title-logo");

    if (!titleText || !titleLogo) {
        console.error("Error: Elements not found. Ensure IDs match in HTML.");
        return;
    }

    // Ensure title logo is hidden initially
    titleLogo.style.opacity = "0";
    titleLogo.style.transition = "opacity 0.3s ease-in-out";
    titleText.style.transition = "opacity 0.3s ease-in-out";

    window.addEventListener("scroll", function() {
        if (window.scrollY > 50) { 
            titleText.style.opacity = "0";
            titleLogo.style.opacity = "1";
        } else {
            titleText.style.opacity = "1";
            titleLogo.style.opacity = "0";
        }
    });
});