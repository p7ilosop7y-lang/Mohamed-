// script.js
// Firebase SDK configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5WZP74RfeYoPv_kHXRhNtDYzRp2dOPeU", // Note: It is safer to use environment variables for this
  authDomain: "mo777-2b57e.firebaseapp.com",
  projectId: "mo777-2b57e",
  storageBucket: "mo777-2b57e.firebasestorage.app",
  messagingSenderId: "318111712614",
  appId: "1:318111712614:web:460e225f4f429c7f13f4a7"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);
  }

  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');

  function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('open');
  }

  function closeMenu() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
  }

  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;

  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  function showSection(sectionId) {
    sections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });
    const el = document.getElementById(sectionId);
    if (el) {
      el.style.display = 'block';
      el.classList.add('active');
    }
  }

  function handleNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#image/')) {
      showSection('portfolio');
    } else {
      const sectionId = hash.substring(1) || 'portfolio';
      showSection(sectionId);
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      history.pushState(null, '', '#' + sectionId);
      showSection(sectionId);
      closeMenu();
    });
  });

  const nameEl = document.getElementById('name');
  nameEl.innerHTML = nameEl.textContent.split('').map((ch) => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');

  const roleEl = document.getElementById("role");
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;

  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) {
      roleEl.textContent += currentRole.charAt(charIndex++);
    } else if (deleting && charIndex > 0) {
      roleEl.textContent = currentRole.substring(0, --charIndex);
    } else {
      deleting = !deleting;
      if (!deleting) {
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }
    setTimeout(typeWriter, deleting ? 100 : 150);
  }

  const gallery = document.getElementById('gallery');
  let currentImageIndex = -1;
  let allImages = [];

  function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function loadImages(category = 'all') {
    let query = db.collection("portfolioimages").orderBy("timestamp", "desc");
    if (category !== 'all') {
      query = query.where("category", "==", category);
    }
    try {
      const querySnapshot = await query.get();
      allImages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderGallery();

      const urlHash = window.location.hash;
      if (urlHash.startsWith('#image/')) {
        const imageId = urlHash.substring(7);
        const imageIndex = allImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
          openLightbox(imageIndex);
        }
      }
    } catch (error) {
        console.error("Error loading images from Firestore:", error);
        gallery.innerHTML = "<p>Failed to load gallery. Please try again later.</p>";
    }
  }

  function renderGallery() {
    gallery.innerHTML = '';
    allImages.forEach((imgObj, index) => addImageCard(imgObj, index));
  }

  function addImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    const liked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);
    const isAdmin = auth.currentUser && auth.currentUser.email === 'p7ilosop7y@gmail.com';

    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork by Mohamed Tammam')}" loading="lazy"></div>
      <div class="title-container" style="padding: 12px; text-align: right;"><h3>${escapeHtml(imgObj.title || 'Untitled Image')}</h3></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; padding: 0 12px 8px;">
          <span class="like-count" style="color: var(--muted); font-size: 14px; margin-right: 8px;">${imgObj.likes || 0}</span>
          <button class="like-btn" aria-label="Like this image" style="background: none; border: none; color: ${liked ? 'var(--accent)' : 'var(--muted)'}; cursor: pointer; font-size: 20px;">
              <i class="${liked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
          </button>
          <a href="${imgObj.src}" download class="download-btn" aria-label="Download this image" style="background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; margin-left: 8px;"><i class="fas fa-download" aria-hidden="true"></i></a>
      </div>
      <div class="comments-section">
        <div class="comments-list">
          ${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment)}</span></div>`).join('')}
        </div>
        <form class="comment-form">
            <label for="comment-input-${index}" class="visually-hidden">Add a comment</label>
            <input id="comment-input-${index}" class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
            <button class="comment-btn" type="submit" aria-label="Submit comment"><i class="fas fa-paper-plane"></i></button>
        </form>
      </div>
    `;
    gallery.appendChild(card);

    card.querySelector('.thumb img').addEventListener('click', () => {
      openLightbox(index);
    });
  }

  const lightbox = document.getElementById('lightbox');
  const lbImage = document.getElementById('lbImage');

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    currentImageIndex = index;
    lbImage.src = allImages[index].src;
    lbImage.alt = `Enlarged view of ${escapeHtml(allImages[index].title || 'artwork')}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';

    const imageUrl = `#image/${allImages[index].id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open');
    document.body.style.overflow = 'auto';
  }

  function navigateLightbox(direction) {
    if (allImages.length === 0) return;

    const slideOutX = direction === 1 ? '-50px' : '50px';
    const slideInX = direction === 1 ? '50px' : '-50px';

    lbImage.style.opacity = 0;
    lbImage.style.transform = `translateX(${slideOutX})`;

    currentImageIndex = (currentImageIndex + direction + allImages.length) % allImages.length;

    setTimeout(() => {
      lbImage.src = allImages[currentImageIndex].src;
      lbImage.alt = `Enlarged view of ${escapeHtml(allImages[currentImageIndex].title || 'artwork')}`;
      
      lbImage.style.transition = 'none';
      lbImage.style.transform = `translateX(${slideInX})`;
      
      setTimeout(() => {
        lbImage.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        lbImage.style.opacity = 1;
        lbImage.style.transform = 'translateX(0)';
      }, 20);

    }, 300);

    const imageUrl = `#image/${allImages[currentImageIndex].id}`;
    history.replaceState({ lightbox: 'open' }, '', imageUrl);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      history.back();
    }
  });

  document.getElementById('prevArrow').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });

  document.getElementById('nextArrow').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('open')) {
      if (e.key === 'ArrowRight') navigateLightbox(-1); // Previous in RTL
      if (e.key === 'ArrowLeft') navigateLightbox(1); // Next in RTL
      if (e.key === 'Escape') history.back();
    }
  });

  let lightboxStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('avatar-open')) {
      lightboxStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (!lightbox.classList.contains('avatar-open') && lightboxStartX !== 0) {
      const lightboxEndX = e.changedTouches[0].clientX;
      const distance = lightboxEndX - lightboxStartX;

      if (distance < -50) { // Swipe Left
        navigateLightbox(1); // Next
      } else if (distance > 50) { // Swipe Right
        navigateLightbox(-1); // Previous
      }
      lightboxStartX = 0;
    }
  });

  window.addEventListener('popstate', () => {
    if (!window.location.hash.startsWith('#image/')) {
      closeLightbox();
    }
    handleNavigation();
  });

  document.getElementById('avatarImg').addEventListener('click', function() {
    lbImage.src = this.src;
    lbImage.alt = "Enlarged view of Mohamed Tammam's avatar";
    lightbox.classList.add('open', 'avatar-open');
  });

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter-btn.active').classList.remove('active');
      button.classList.add('active');
      loadImages(button.dataset.category);
    });
  });

  auth.onAuthStateChanged((user) => {
    const isAdmin = user && user.email === 'p7ilosop7y@gmail.com';
    document.getElementById('auth-btn').textContent = isAdmin ? 'تسجيل الخروج' : 'Logout';
    document.getElementById('addImageBtn').style.display = isAdmin ? 'block' : 'none';
    renderGallery();
  });

  handleNavigation();
  loadImages();
  typeWriter();
});


