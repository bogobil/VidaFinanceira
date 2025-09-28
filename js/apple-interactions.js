// Apple-like interactions and animations
class AppleInteractions {
  constructor() {
    this.init();
  }

  init() {
    this.setupThemeToggle();
    this.setupPageAnimations();
    this.setupButtonAnimations();
    this.setupFormAnimations();
    this.setupScrollAnimations();
    this.setupNotifications();
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (!themeToggle) return;
    
    // Verificar tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light-theme';
    body.className = savedTheme;
    this.updateThemeButton(savedTheme);
    
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.addRippleEffect(themeToggle);
      
      if (body.classList.contains('light-theme')) {
        body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('theme', 'dark-theme');
        this.updateThemeButton('dark-theme');
      } else {
        body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('theme', 'light-theme');
        this.updateThemeButton('light-theme');
      }
    });
  }

  updateThemeButton(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    if (theme === 'dark-theme') {
      themeToggle.innerHTML = '<i class="fas fa-sun me-1"></i> Modo Claro';
      themeToggle.classList.replace('btn-outline-secondary', 'btn-outline-light');
    } else {
      themeToggle.innerHTML = '<i class="fas fa-moon me-1"></i> Modo Escuro';
      themeToggle.classList.replace('btn-outline-light', 'btn-outline-secondary');
    }
  }

  setupPageAnimations() {
    // Animação de entrada da página
    document.body.classList.add('page-enter');
    
    // Intersection Observer para animações de cards
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-appear');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.card').forEach(card => {
      observer.observe(card);
    });
  }

  setupButtonAnimations() {
    // Floating Action Button
    const floatingBtn = document.getElementById('floating-add');
    if (floatingBtn) {
      floatingBtn.addEventListener('click', function() {
        this.classList.add('btn-press');
        setTimeout(() => this.classList.remove('btn-press'), 300);
      });
    }

    // Todos os botões com efeito ripple
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.addRippleEffect(btn);
      });
    });
  }

  setupFormAnimations() {
    // Animações para inputs
    document.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
      });
      
      input.addEventListener('blur', function() {
        if (!this.value) {
          this.parentElement.classList.remove('focused');
        }
      });
    });

    // Validação com animações
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        const invalidInputs = form.querySelectorAll(':invalid');
        invalidInputs.forEach(input => {
          input.classList.add('shake-animation');
          setTimeout(() => input.classList.remove('shake-animation'), 500);
        });
      });
    });
  }

  setupScrollAnimations() {
    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  setupNotifications() {
    // Sistema de notificações Apple-like
    this.createNotificationContainer();
  }

  createNotificationContainer() {
    if (document.getElementById('notification-container')) return;
    
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 350px;
    `;
    document.body.appendChild(container);
  }

  showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification-enter`;
    notification.style.cssText = `
      margin-bottom: 10px;
      border-radius: 12px;
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    `;
    
    notification.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-${this.getNotificationIcon(type)} me-2"></i>
        <span>${message}</span>
        <button type="button" class="btn-close ms-auto" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      notification.classList.add('notification-exit');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);

    // Manual close
    notification.querySelector('.btn-close').addEventListener('click', () => {
      notification.classList.add('notification-exit');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  getNotificationIcon(type) {
    const icons = {
      'success': 'check-circle',
      'error': 'exclamation-triangle',
      'warning': 'exclamation-circle',
      'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  addRippleEffect(element) {
    element.classList.add('ripple-effect');
    setTimeout(() => element.classList.remove('ripple-effect'), 600);
  }

  // Método público para mostrar loading
  showLoading(element) {
    if (!element) return;
    element.classList.add('apple-spinner');
  }

  hideLoading(element) {
    if (!element) return;
    element.classList.remove('apple-spinner');
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.appleInteractions = new AppleInteractions();
});

// Exportar para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppleInteractions;
}