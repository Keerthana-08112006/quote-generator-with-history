
const quoteElement = document.getElementById("quote");
const authorElement = document.getElementById("author");
const messageElement = document.getElementById("message");
const favoritesList = document.getElementById("favoritesList");
const favoriteCount = document.getElementById("favoriteCount");

const newQuoteBtn = document.getElementById("newQuoteBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const copyBtn = document.getElementById("copyBtn");

let currentQuote = null;
let loading = false;
let saving = false;

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

async function loadQuote() {
  if (loading) return;

  loading = true;
  newQuoteBtn.disabled = true;
  messageElement.textContent = "Loading quote...";

  try {
    const data = await apiRequest("/api/quote");

    currentQuote = {
      quote: data.quote,
      author: data.author
    };

    quoteElement.textContent = `“${data.quote}”`;
    authorElement.textContent = `— ${data.author}`;
    messageElement.textContent = "";
  } catch (error) {
    messageElement.textContent = error.message;
  } finally {
    loading = false;
    newQuoteBtn.disabled = false;
  }
}

async function loadFavorites() {
  try {
    const favorites = await apiRequest("/api/favorites");

    favoriteCount.textContent = `${favorites.length} saved`;
    favoritesList.replaceChildren();

    if (favorites.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No favorites yet. Save a quote you love!";
      favoritesList.appendChild(empty);
      return;
    }

    favorites.forEach((favorite) => {
      const card = document.createElement("article");
      card.className = "favorite-item";

      const content = document.createElement("div");

      const quote = document.createElement("p");
      quote.textContent = `“${favorite.quote}”`;

      const author = document.createElement("p");
      author.className = "favorite-author";
      author.textContent = `— ${favorite.author}`;

      const date = document.createElement("small");
      date.textContent = `Saved: ${favorite.created_at || "Recently"}`;

      content.append(quote, author, date);

      const actions = document.createElement("div");
      actions.className = "favorite-actions";

      const copyButton = document.createElement("button");
      copyButton.textContent = "Copy";

      copyButton.addEventListener("click", async () => {
        try {
          await copyQuote(`“${favorite.quote}” — ${favorite.author}`);
          messageElement.textContent = "Favorite quote copied!";
        } catch {
          messageElement.textContent = "Could not copy quote.";
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Remove";

      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
          await apiRequest(`/api/favorites/${favorite.id}`, {
            method: "DELETE"
          });

          messageElement.textContent = "Favorite removed!";
          await loadFavorites();
        } catch (error) {
          messageElement.textContent = error.message;
          deleteButton.disabled = false;
        }
      });

      actions.append(copyButton, deleteButton);
      card.append(content, actions);
      favoritesList.appendChild(card);
    });
  } catch (error) {
    favoritesList.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = error.message;
    favoritesList.appendChild(empty);
  }
}

async function saveFavorite() {
  if (!currentQuote || saving) return;

  saving = true;
  favoriteBtn.disabled = true;

  try {
    await apiRequest("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(currentQuote)
    });

    messageElement.textContent = "Added to your favorites!";
    await loadFavorites();
  } catch (error) {
    messageElement.textContent = error.message;
  } finally {
    saving = false;
    favoriteBtn.disabled = false;
  }
}

async function copyQuote(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  const success = document.execCommand("copy");
  textarea.remove();

  if (!success) throw new Error("Copy failed");
}

newQuoteBtn.addEventListener("click", loadQuote);
favoriteBtn.addEventListener("click", saveFavorite);

copyBtn.addEventListener("click", async () => {
  if (!currentQuote) return;

  try {
    await copyQuote(`“${currentQuote.quote}” — ${currentQuote.author}`);
    messageElement.textContent = "Quote copied to clipboard!";
  } catch {
    messageElement.textContent = "Could not copy quote.";
  }
});

loadQuote();
loadFavorites();
