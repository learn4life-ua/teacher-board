const notice=document.createElement('section');
notice.className='phone-device-notice';
notice.setAttribute('aria-label','Повідомлення про підтримувані пристрої');
notice.innerHTML=`
  <div class="phone-device-card">
    <div class="phone-device-icon" aria-hidden="true">▣</div>
    <h1>TeacherBoard найкраще працює на комп’ютері або ноутбуці</h1>
    <p>Мобільна версія дошки поки недоступна.</p>
    <p>Для коректної роботи з графіками, геометричними інструментами та іншими можливостями відкрийте TeacherBoard на пристрої з більшим екраном.</p>
    <p class="phone-device-note">Дякуємо за розуміння.</p>
  </div>`;

document.body.prepend(notice);
