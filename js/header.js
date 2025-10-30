document.addEventListener("DOMContentLoaded", function() {
  // ヘッダーを挿入する場所（placeholder）を取得
  const headerPlaceholder = document.getElementById("header-placeholder");
  
  if (headerPlaceholder) {
    // header.html を読み込む
    fetch('../header.html')
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.text();
      })
      .then(data => {
        // 読み込んだHTMLをプレースホルダーに挿入
        headerPlaceholder.innerHTML = data;
      })
      .catch(error => {
        console.error('ヘッダーの読み込みに失敗しました:', error);
        headerPlaceholder.innerHTML = "<p>ヘッダーの読み込みエラー</p>";
      });
  }
});