// iOS 100vh 튐 방지 (주소창 높이 변화 대응)
(function() {
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  setVH();
  
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
})();

// 아코디언 접근성 + 부드러운 오픈/클로즈 (높이 자동 계산)
document.addEventListener('DOMContentLoaded', function() {
  const ACC_DURATION = 220;
  
  document.querySelectorAll('.accordion-item, .ax-acc-item').forEach(item => {
    const btn = item.querySelector('.accordion-trigger, .nav-trigger');
    const panel = item.querySelector('.accordion-panel, .ax-acc-panel');
    
    if (!btn || !panel) return;
    
    // 패널 내부 스크롤 컨테이너 (없으면 패널 자체 사용)
    const scroller = panel.querySelector('.panel-scroll') || panel;
    
    const open = () => {
      panel.dataset.open = 'true';
      // 콘텐츠 실제 높이를 읽어서 height 트랜지션
      const targetHeight = scroller.scrollHeight;
      panel.style.setProperty('--acc-target-h', targetHeight + 'px');
      panel.style.height = targetHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    };
    
    const close = () => {
      // 현재 높이로 고정 후 0으로 애니메이트
      const currentHeight = scroller.scrollHeight;
      panel.style.height = currentHeight + 'px';
      
      requestAnimationFrame(() => {
        panel.dataset.open = 'false';
        panel.style.removeProperty('--acc-target-h');
        panel.style.height = '0px';
        
        setTimeout(() => {
          panel.style.height = '';
        }, ACC_DURATION + 20);
      });
      
      btn.setAttribute('aria-expanded', 'false');
    };
    
    // aria 설정
    if (!panel.id) {
      panel.id = 'acc-panel-' + Math.random().toString(36).substr(2, 9);
    }
    btn.setAttribute('aria-controls', panel.id);
    
    // 클릭 이벤트
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      (panel.dataset.open === 'true') ? close() : open();
    });
    
    // 데스크톱만 hover 오픈 (터치 디바이스 제외)
    const prefersHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (prefersHover) {
      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);
    }
  });
});
