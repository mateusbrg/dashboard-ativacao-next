const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('pt-BR');
const time = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});
let previous = null;

async function refresh() {
  try {
    const response = await fetch('/api/comments', {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Sem conexão');
    const data = await response.json();
    const configuredGoal = Number(data.goal);
    const GOAL =
      Number.isSafeInteger(configuredGoal) && configuredGoal > 0
        ? configuredGoal
        : 200;
    const sameDay = previous?.day === data.day;
    const newComment =
      sameDay &&
      data.latestCommentAt &&
      (!previous.latestCommentAt ||
        data.latestCommentAt > previous.latestCommentAt);
    $('total').textContent = number.format(data.total);
    $('fraction').textContent =
      `${number.format(data.total)} / ${number.format(GOAL)}`;
    $('progress').max = GOAL;
    $('progress').value = data.total;
    $('goal-title').textContent =
      data.total >= GOAL
        ? 'Meta alcançada. Obrigado, comunidade!'
        : 'Nossa meta coletiva';
    $('remaining').textContent =
      data.total >= GOAL
        ? 'Continue compartilhando experiências úteis.'
        : `Faltam ${number.format(GOAL - data.total)} comentários para a meta.`;
    $('connection').textContent = 'Atualizando ao vivo';
    $('connection').classList.remove('offline');
    $('connection').classList.add('online');
    $('updated').textContent =
      `Última atualização às ${time.format(new Date())}`;
    if (!sameDay) {
      $('notice').textContent = 'O próximo comentário pode ser o seu.';
    } else if (newComment) {
      $('notice').textContent =
        `Novo comentário no Next! Publicado às ${time.format(new Date(data.latestCommentAt))}.`;
    }
    previous = data;
  } catch {
    $('connection').textContent = 'Sem conexão · tentando novamente';
    $('connection').classList.add('offline');
    $('connection').classList.remove('online');
  } finally {
    setTimeout(refresh, 5000);
  }
}
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $('fullscreen').textContent = 'Use F11 para tela cheia';
  }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').textContent = document.fullscreenElement
    ? 'Sair da tela cheia'
    : 'Tela cheia';
});
refresh();
