document.addEventListener("DOMContentLoaded", function() {
    var toggleButton = document.getElementById("toggle-button");
    var sidebar = document.querySelector(".sidebar");
    var main = document.querySelector(".main");

    toggleButton.addEventListener("click", function() {
        sidebar.classList.toggle("collapsed");
        main.classList.toggle("full-width");
    });
});
