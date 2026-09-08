// A/B Testing System for AiXSignal
// Variant A: No gradient | Variant B: Gradient on emphasis

(function initABTest() {
  // Determine variant: query param → localStorage → random
  const params = new URLSearchParams(window.location.search);
  const queryVariant = params.get('ab');
  const savedVariant = localStorage.getItem('ab');
  const variants = ['abA', 'abB'];
  const selectedVariant = queryVariant || savedVariant || variants[Math.floor(Math.random() * 2)];
  
  // Apply variant class to html element
  document.documentElement.classList.add(selectedVariant);
  localStorage.setItem('ab', selectedVariant);
  
  // Initialize dataLayer for tracking
  window.dataLayer = window.dataLayer || [];
  
  const track = (event, properties = {}) => {
    window.dataLayer.push({
      event,
      ...properties,
      timestamp: Date.now(),
      variant: selectedVariant
    });
  };
  
  // Track 50% scroll depth
  let scrollFired = false;
  const trackScroll50 = () => {
    const scrollPercentage = 
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    
    if (!scrollFired && scrollPercentage >= 0.5) {
      scrollFired = true;
      track('scroll_50', { 
        ab: selectedVariant,
        depth: Math.round(scrollPercentage * 100)
      });
    }
  };
  
  window.addEventListener('scroll', trackScroll50, { passive: true });
  
  // Track CTA clicks
  document.addEventListener('click', (e) => {
    const ctaElement = e.target.closest('[data-cta]');
    if (!ctaElement) return;
    
    track('cta_click', {
      id: ctaElement.dataset.cta,
      ab: selectedVariant,
      text: ctaElement.textContent.trim()
    });
  });
  
  // Track page view
  track('page_view', {
    ab: selectedVariant,
    page: window.location.pathname
  });
  
  console.log(`[A/B Test] Variant: ${selectedVariant}`);
})();

// Modal utilities
window.openModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute('open', '');
};

window.closeModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) modal.removeAttribute('open');
};

// Mobile tooltip toggle
document.addEventListener('click', (e) => {
  const wrapper = e.target.closest('.lq-tip-wrap');
  if (!wrapper) return;
  
  // Only on touch devices
  if (window.matchMedia('(hover: none)').matches) {
    const tip = wrapper.querySelector('.lq-tip');
    if (!tip) return;
    
    const isVisible = getComputedStyle(tip).opacity !== '0';
    tip.style.opacity = isVisible ? '0' : '1';
    tip.style.scale = isVisible ? '0.98' : '1';
  }
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('lq-modal-backdrop')) {
    e.target.removeAttribute('open');
  }
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.lq-modal-backdrop[open]').forEach(modal => {
      modal.removeAttribute('open');
    });
  }
});
