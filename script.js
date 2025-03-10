window.addEventListener("scroll", function() {
    let titleText = document.getElementById("title-text");
    let titleLogo = document.getElementById("title-logo");

    if (window.scrollY > 50) { // Adjust scroll threshold as needed
        titleText.style.opacity = "0";
        titleLogo.style.opacity = "1";
    } else {
        titleText.style.opacity = "1";
        titleLogo.style.opacity = "0";
    }
});