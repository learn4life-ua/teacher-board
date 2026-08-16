const polish=document.createElement('style');
polish.textContent=`
.scene[data-background="grid"]{
  background-color:#fff;
  background-image:linear-gradient(#d9e5e1 1px,transparent 1px),linear-gradient(90deg,#d9e5e1 1px,transparent 1px);
  background-size:24px 24px;
}
.scene[data-background="lines"]{
  background-color:#fff;
  background-image:linear-gradient(#d9e5e1 1px,transparent 1px);
  background-size:100% 28px;
}
.scene[data-background="coords"]{
  background-color:#fff;
  background-image:
    linear-gradient(to bottom,transparent calc(50% - 1px),#76998e calc(50% - 1px),#76998e calc(50% + 1px),transparent calc(50% + 1px)),
    linear-gradient(to right,transparent calc(50% - 1px),#76998e calc(50% - 1px),#76998e calc(50% + 1px),transparent calc(50% + 1px)),
    linear-gradient(#e7efec 1px,transparent 1px),
    linear-gradient(90deg,#e7efec 1px,transparent 1px),
    linear-gradient(#aac5bc 1px,transparent 1px),
    linear-gradient(90deg,#aac5bc 1px,transparent 1px);
  background-size:100% 100%,100% 100%,20px 20px,20px 20px,100px 100px,100px 100px;
}
.graph-object,.graph-object>svg{overflow:hidden;}
.graph-object>svg{border-radius:8px;}
`;
document.head.appendChild(polish);

const notice=document.createElement('section');
notice.className='phone-device-notice';
notice.setAttribute('aria-label','Повідомлення про підтримувані пристрої');
notice.innerHTML=`
  <div class="phone-device-card">
    <div class="phone-device-icon" aria-hidden="true">▣</div>
    <h1>TeacherBoard найкраще працює на комп’ютері або ноутбуці</h1>
    <p>Мобільна версія дошки поки недоступна.</p>
    <p>Для роботи з графіками та геометричними інструментами відкрийте TeacherBoard на пристрої з більшим екраном.</p>
    <p class="phone-device-note">Дякуємо за розуміння.</p>
  </div>`;

document.body.prepend(notice);
