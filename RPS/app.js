let userScore = 0;
let computerScore = 0;
const userScore_span = document.getElementById('user-score');
const computerScore_span = document.getElementById('computer-score');
const scoreBoard_div = document.querySelector('.score-board');
const result_p = document.querySelector('.result > p');
const rock_div = document.getElementById('r');
const paper_div = document.getElementById('p');
const scissors_div = document.getElementById('s');

const formatScore = value => String(value).padStart(2, '0');

function createParticles(animationType) {
  const particleEmojis = animationType === 'fireworks' ? ['🎆', '✨', '🎇', '⭐', '💥'] : ['💣', '🔥', '⚡', '💥', '🌪️'];
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = particleEmojis[Math.floor(Math.random() * particleEmojis.length)];
    
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 5 + Math.random() * 10;
    const tx = Math.cos(angle) * velocity * 50;
    const ty = Math.sin(angle) * velocity * 50;
    
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.animation = `${animationType} 1.0s ease-out forwards`;
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 800);
  }
}

function updateScoreBoard() {
  if (userScore >= 99 || computerScore >= 99) {
    if (userScore >= 99) {
      createParticles('fireworks');
    } else if (computerScore >= 99) {
      createParticles('explosion');
    }
    userScore = 0;
    computerScore = 0;
  }
  userScore_span.textContent = formatScore(userScore);
  computerScore_span.textContent = formatScore(computerScore);
}

function getComputerChoice() {
  const choices = ['r', 'p', 's'];
  const randomNumber = Math.floor(Math.random() * 3);
  return choices[randomNumber];
}

function convertToWord(letter) {
  if (letter === 'r') return 'Rock';
  if (letter === 'p') return 'Paper';
  return 'Scissors';
}

function win(userChoice, computerChoice) {
  const userChoice_div = document.getElementById(userChoice);
  userScore++;
  updateScoreBoard();
  result_p.innerHTML = `${convertToWord(userChoice)} beats ${convertToWord(computerChoice)}. You Win!`;
  userChoice_div.classList.add('green-glow');
  setTimeout(() => userChoice_div.classList.remove('green-glow'), 300);
}

function lose(userChoice, computerChoice) {
  const userChoice_div = document.getElementById(userChoice);
  computerScore++;
  updateScoreBoard();
  result_p.innerHTML = `${convertToWord(userChoice)} loses to ${convertToWord(computerChoice)}. You lost...`;
  userChoice_div.classList.add('red-glow');
  setTimeout(() => userChoice_div.classList.remove('red-glow'), 300);
}

function draw(userChoice, computerChoice) {
  const userChoice_div = document.getElementById(userChoice);
  result_p.innerHTML = `${convertToWord(userChoice)} equals ${convertToWord(computerChoice)}. It is a draw`;
  userChoice_div.classList.add('gray-glow');
  setTimeout(() => userChoice_div.classList.remove('gray-glow'), 300);
}

function game(userChoice) {
  const computerChoice = getComputerChoice();
  switch (userChoice + computerChoice) {
    case 'rs':
    case 'pr':
    case 'sp':
      win(userChoice, computerChoice);
      break;
    case 'rp':
    case 'ps':
    case 'sr':
      lose(userChoice, computerChoice);
      break;
    case 'rr':
    case 'pp':
    case 'ss':
      draw(userChoice, computerChoice);
      break;
  }
}

function main() {
  rock_div.addEventListener('click', () => game('r'));
  paper_div.addEventListener('click', () => game('p'));
  scissors_div.addEventListener('click', () => game('s'));
}

updateScoreBoard();
main();
