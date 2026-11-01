import { STORY } from '../data/content.js?v=2';

const PHASES = { harvest: 'Harvest', drying: 'Drying & resting', flowering: 'Flowering', growth: 'Growth', ripening: 'Ripening' };

export function renderStory() {
  const grid = document.getElementById('storyGrid');
  grid.innerHTML = `
    <div class="rv">
      <p class="sty__lede">${STORY.lede}</p>
      <div class="sty__text">${STORY.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
    </div>
    <div class="sty__facts rv">
      ${STORY.facts.map((f) => `<p class="sty__fact"><b>${f.value}</b><span>${f.label}</span></p>`).join('')}
    </div>
    <blockquote class="sty__quote rv">
      <p>“${STORY.quote.text}”</p>
      <cite>${STORY.quote.who}</cite>
    </blockquote>
    <div class="sty__cal rv">
      <h3>A year on the hillside</h3>
      <ol class="cal" aria-label="Harvest calendar">
        ${STORY.calendar.map((c) => `<li class="${c.phase}"><i aria-hidden="true"></i><span class="vh">${PHASES[c.phase]}: </span>${c.m}</li>`).join('')}
      </ol>
      <p class="cal__legend">
        <span><i class="harvest" style="background:var(--cherry-ink)"></i>Harvest</span>
        <span><i style="background:var(--brass-ink)"></i>Drying &amp; resting</span>
        <span><i style="background:#e7e1d1;border:1px solid var(--paper-3)"></i>Flowering</span>
        <span><i style="background:var(--paper-2)"></i>Growth</span>
        <span><i style="background:#c98a4a"></i>Ripening</span>
      </p>
    </div>`;
}
