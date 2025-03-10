window.addEventListener("DOMContentLoaded", function () {
  let titleText = document.getElementById("title-text");
  let titleLogo = document.getElementById("title-logo");

  if (!titleText || !titleLogo) {
    console.error("Error: 'title-text' or 'title-logo' elements not found.");
    return;
  }

  // Initially show text, hide logo
  titleText.style.opacity = "1";
  titleLogo.style.opacity = "0";

  // After 2 seconds, fade to signature
  setTimeout(() => {
    titleText.style.opacity = "0";
    titleLogo.style.opacity = "1";
  }, 2000);

  // Hover effect: Show text when hovering over the logo
  titleLogo.addEventListener("mouseenter", () => {
    titleText.style.opacity = "1";
    titleLogo.style.opacity = "0";
  });

  // When mouse leaves, show the signature again
  titleLogo.addEventListener("mouseleave", () => {
    titleText.style.opacity = "0";
    titleLogo.style.opacity = "1";
  });
});