const ws = new WebSocket('ws://localhost:8000/ws');
const balanceEl = document.getElementById('balance');
const resultEl = document.getElementById('result');
const cornerBalance = document.getElementById('cornerBalance');

function showPopup(text){
  const p = document.createElement('div');
  p.className = 'popup';
  p.textContent = text;
  document.body.appendChild(p);
  setTimeout(()=>{ p.classList.add('flash'); },50);
  setTimeout(()=>p.remove(),2500);
}

ws.addEventListener('open', ()=>{
  console.log('ws open');
  fetch('http://localhost:8000/balance').then(r=>r.json()).then(j=>{ 
    balanceEl.textContent = parseFloat(j.balance).toFixed(2);
    cornerBalance.textContent = parseFloat(j.balance).toFixed(2);
  }).catch(()=>{});
});

ws.addEventListener('message', (ev)=>{
  const d = JSON.parse(ev.data);
  if(d.error){
    showPopup('Saldo insuficiente. Por favor, realiza un depósito');
    return;
  }
  if(d.event === 'balance_update'){
    balanceEl.textContent = d.balance.toFixed(2);
    cornerBalance.textContent = d.balance.toFixed(2);
    flashBalance();
  }
  if(d.event === 'spin_result'){
    resultEl.innerHTML = `<strong>Resultado:</strong> ${d.result} — Premio: ${d.payout}`;
    if(d.payout>0) fireworks();
  }
});

function flashBalance(){
  balanceEl.classList.add('flash');
  setTimeout(()=>balanceEl.classList.remove('flash'),900);
}

// Prevent spinning if insufficient funds
document.getElementById('spin').addEventListener('click', ()=>{
  const bet = parseFloat(document.getElementById('bet').value);
  const number = parseInt(document.getElementById('number').value);
  const current = parseFloat(cornerBalance.textContent) || 0;
  if(bet <= 0){ showPopup('Apuesta inválida'); return; }
  if(bet > current){ showPopup('Saldo insuficiente. Por favor, realiza un depósito'); return; }
  ws.send(JSON.stringify({action:'spin_roulette', bet, bet_type:'number', number}));
});

// Deposit from lobby
document.getElementById('deposit').addEventListener('click', ()=>{
  const amount = parseFloat(prompt('Monto a depositar', '100')) || 0;
  if(amount>0) ws.send(JSON.stringify({action:'deposit', amount}));
});

// Withdraw from lobby (demo request)
document.getElementById('withdraw').addEventListener('click', ()=>{
  const amount = parseFloat(prompt('Monto a retirar', '50')) || 0;
  ws.send(JSON.stringify({action:'withdraw_request', amount}));
  alert('Solicitud de retiro enviada (demo).');
});

// Quick deposit inside game
const quickDeposit = document.getElementById('quickDeposit');
quickDeposit.addEventListener('click', ()=>{
  const amount = parseFloat(prompt('Depositar (rápido)', '50')) || 0;
  if(amount>0) ws.send(JSON.stringify({action:'deposit', amount}));
});

function fireworks(){
  const n = document.createElement('div');
  n.style.position='fixed'; n.style.left='50%'; n.style.top='20%'; n.style.transform='translateX(-50%)';
  n.innerHTML = '<div style="background:linear-gradient(90deg,#ffb84d,#ffd700);padding:12px;border-radius:8px;color:#000;font-weight:800">¡MEGA WIN!</div>';
  document.body.appendChild(n);
  setTimeout(()=>n.remove(),1600);
}
