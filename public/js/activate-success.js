document.addEventListener("DOMContentLoaded", function () {
  const closeBtn = document.getElementById("closeBtn");
  closeBtn.addEventListener("click", function () {
    window.open("", "_self");
    window.close();
  });
});
