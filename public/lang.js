const LANG = {
  en: {
    login: "Login with Spotify",
    play: "Play Random Song",
    stop: "Stop",
    reveal: "Reveal",
    guess: "Guess the year!"
  },
  pl: {
    login: "Zaloguj do Spotify",
    play: "Puść piosenkę",
    stop: "Stop",
    reveal: "Odkryj",
    guess: "Zgadnij rok!"
  }
};

let currentLang = "en";

function setLang(lang){
  currentLang = lang;
  document.querySelectorAll("[data-text]").forEach(el=>{
    el.innerText = LANG[lang][el.dataset.text];
  });
}