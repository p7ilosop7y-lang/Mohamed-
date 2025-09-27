// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB7FP6JmpJKxkV45JkEml3WsmaNsiPCCug",
  authDomain: "mo666-a7694.firebaseapp.com",
  projectId: "mo666-a7694",
  storageBucket: "mo666-a7694.firebasestorage.app",
  messagingSenderId: "698308460915",
  appId: "1:698308460915:web:cd78096f21966102f60506",
  measurementId: "G-MRP3390FKD"
};

/******************************************************************************
 * ملاحظة أمنية:
 * إن وجود مفاتيح الإعداد الخاصة بـ Firebase هنا أمر طبيعي، 
 * ولكن الحماية الحقيقية تأتي من "قواعد الأمان" الصارمة 
 * التي قمت بضبطها في لوحة تحكم Firestore.
 ******************************************************************************/

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);
  }

  // --- DOM Elements ---
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');
  const nameEl = document.getElementById('name');
  const roleEl = document.getElementById("role");
  const gallery = document.getElementById('gallery');
  const lightbox = document.getElementById('lightbox');
  const lightboxContent = document.getElementById('lightboxContent');
  const lbImage = document.getElementById('lbImage');
  const lbImageNext = document.getElementById('lbImageNext');
  const prevArrow = document.getElementById('prevArrow');
  const nextArrow = document.getElementById('nextArrow');
  const avatarImg = document.getElementById('avatarImg');
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const cursorEl = document.querySelector('.cursor');
  
  // --- Admin Elements ---
  const loginContainer = document.getElementById('loginContainer');
  const adminPanel = document.getElementById('adminPanel');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const uploadForm = document.getElementById('uploadForm');
  const imageFileInput = document.getElementById('imageFile');
  const imagePreview = document.getElementById('imagePreview');
  
  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  let isTransitioning = false;
  
  function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('open');
  }

  function closeMenu() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
  }
  
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  document.addEventListener('touchstart', e => {
    if (e.target.closest('#lightbox')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (e.target.closest('#lightbox')) return;
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleMenuSwipe();
  });
  
  function handleMenuSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const swipeThreshold = 50;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) {
          openMenu();
        } else {
          closeMenu();
        }
      }
    }
  }

  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      closeMenu();
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
          const sectionId = href.substring(1);
          showSection(sectionId);
      }
    });
  });
  
  let scale = 1, isZoomed = false;
  let panStartX, panStartY, translateX = 0, translateY = 0;
  let lastTap = 0;
  let swipeLbStartX = 0, swipeLbStartY = 0, swipeLbCurrentX = 0, swipeLbCurrentY = 0;
  let isLightboxSwiping = false, lightboxSwipeDirection = null;
  const swipeThresholdX = 50, swipeThresholdY = 80;

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    resetZoom();
    currentImageIndex = index;
    const img = allImages[index];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    lbImageNext.style.display = 'none';
    lbImage.style.opacity = 1;
    lightbox.style.setProperty('--bg-opacity', 0.9);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lightbox-is-open');
    const imageUrl = `#image/${img.id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open', 'zoomed');
    document.body.style.overflow = 'auto';
    document.body.classList.remove('lightbox-is-open');
    setTimeout(() => {
      lightbox.style.setProperty('--bg-opacity', 0.9);
      applyTransform(lbImage, 0, 0, 1);
    }, 300);
    if (window.location.hash.startsWith('#image/')) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }

  function applyTransform(element, x, y, s) {
    element.style.setProperty('--tx', x);
    element.style.setProperty('--ty', y);
    element.style.setProperty('--scale', s);
  }

  function resetZoom() {
    scale = 1; translateX = 0; translateY = 0; isZoomed = false;
    lightbox.classList.remove('zoomed');
    lbImage.style.transition = 'transform 0.3s ease-out';
    applyTransform(lbImage, 0, 0, 1);
    setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
  }

  function toggleZoom(e) {
    if (isZoomed) {
      resetZoom();
    } else {
      const rect = lbImage.getBoundingClientRect();
      const originX = (e.clientX || e.touches[0].clientX) - rect.left;
      const originY = (e.clientY || e.touches[0].clientY) - rect.top;
      lbImage.style.transformOrigin = `${originX}px ${originY}px`;
      scale = 2.5;
      isZoomed = true;
      lightbox.classList.add('zoomed');
      lbImage.style.transition = 'transform 0.3s ease-out';
      applyTransform(lbImage, translateX, translateY, scale);
      setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
    }
  }
  
  function slideTo(newIndex, direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    lbImageNext.src = allImages[newIndex].src;
    lbImageNext.style.display = 'block';
    const initialNextX = direction === 1 ? window.innerWidth : -window.innerWidth;
    applyTransform(lbImageNext, initialNextX, 0, 1);
    lbImage.style.transition = 'transform 0.3s ease-out';
    lbImageNext.style.transition = 'transform 0.3s ease-out';
    const finalCurrentImageX = direction === 1 ? -window.innerWidth : window.innerWidth;
    applyTransform(lbImage, finalCurrentImageX, 0, 1);
    applyTransform(lbImageNext, 0, 0, 1);
    setTimeout(() => {
      currentImageIndex = newIndex;
      const newImgData = allImages[currentImageIndex];
      lbImage.src = newImgData.src;
      lbImage.alt = `Enlarged view of ${escapeHtml(newImgData.title || 'artwork')}`;
      history.replaceState({ lightbox: 'open' }, '', `#image/${newImgData.id}`);
      lbImage.style.transition = 'none';
      lbImageNext.style.transition = 'none';
      applyTransform(lbImage, 0, 0, 1);
      lbImageNext.style.display = 'none';
      isTransitioning = false;
    }, 300);
  }

  function onLightboxTouchStart(e) {
    if (isTransitioning) return;
    lbImage.style.transition = 'none';
    lbImageNext.style.transition = 'none';
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      if (isZoomed) {
        panStartX = clientX - translateX;
        panStartY = clientY - translateY;
      } else {
        isLightboxSwiping = true;
        swipeLbStartX = clientX;
        swipeLbStartY = clientY;
        swipeLbCurrentX = clientX;
        swipeLbCurrentY = clientY;
        lightboxSwipeDirection = null;
      }
      const now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); toggleZoom(e); }
      lastTap = now;
    }
  }

  function onLightboxTouchMove(e) {
    if (isTransitioning || !isLightboxSwiping) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      if (isZoomed) {
        const { clientX, clientY } = e.touches[0];
        translateX = clientX - panStartX;
        translateY = clientY - panStartY;
        applyTransform(lbImage, translateX, translateY, scale);
        return;
      }
      swipeLbCurrentX = e.touches[0].clientX;
      swipeLbCurrentY = e.touches[0].clientY;
      const diffX = swipeLbCurrentX - swipeLbStartX;
      const diffY = swipeLbCurrentY - swipeLbStartY;
      if (!lightboxSwipeDirection) {
        if (Math.abs(diffY) > 5 && Math.abs(diffY) > Math.abs(diffX)) {
            lightboxSwipeDirection = 'vertical';
        } else if (Math.abs(diffX) > 5) {
            lightboxSwipeDirection = 'horizontal';
        }
      }
      if (lightboxSwipeDirection === 'vertical' && diffY < 0) {
          const progress = Math.abs(diffY) / (window.innerHeight / 2);
          const newScale = Math.max(0.7, 1 - progress * 0.3);
          const newOpacity = Math.max(0.1, 1 - progress);
          applyTransform(lbImage, 0, diffY, newScale);
          lightbox.style.setProperty('--bg-opacity', 0.9 * newOpacity);
      } else if (lightboxSwipeDirection === 'horizontal') {
          if (lightbox.classList.contains('avatar-open')) return;
          const navDirection = diffX < 0 ? 1 : -1;
          const nextIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length;
          lbImageNext.src = allImages[nextIndex].src;
          lbImageNext.style.display = 'block';
          applyTransform(lbImage, diffX, 0, 1);
          const nextImageX = (navDirection === 1 ? window.innerWidth : -window.innerWidth) + diffX;
          applyTransform(lbImageNext, nextImageX, 0, 1);
      }
    }
  }

  function onLightboxTouchEnd(e) {
    if (!isLightboxSwiping) return;
    isLightboxSwiping = false;
    if (lightboxSwipeDirection === 'vertical') {
        const diffY = swipeLbCurrentY - swipeLbStartY;
        if (diffY < -swipeThresholdY) {
            closeLightbox();
        } else {
            lbImage.style.transition = 'transform 0.3s ease-out';
            applyTransform(lbImage, 0, 0, 1);
            lightbox.style.setProperty('--bg-opacity', 0.9);
        }
    } else if (lightboxSwipeDirection === 'horizontal') {
        if (lightbox.classList.contains('avatar-open')) return;
        const diffX = swipeLbCurrentX - swipeLbStartX;
        const navDirection = diffX < 0 ? 1 : -1;
        if (Math.abs(diffX) > swipeThresholdX) {
            const newIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length;
            slideTo(newIndex, navDirection);
        } else {
            lbImage.style.transition = 'transform 0.3s ease-out';
            lbImageNext.style.transition = 'transform 0.3s ease-out';
            applyTransform(lbImage, 0, 0, 1);
            const nextImageX = navDirection === 1 ? window.innerWidth : -window.innerWidth;
            applyTransform(lbImageNext, nextImageX, 0, 1);
        }
    }
    lightboxSwipeDirection = null;
  }

  lightboxContent.addEventListener('touchstart', onLightboxTouchStart, { passive: false });
  lightboxContent.addEventListener('touchmove', onLightboxTouchMove, { passive: false });
  lightboxContent.addEventListener('touchend', onLightboxTouchEnd, { passive: false });
  
  prevArrow.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (lightbox.classList.contains('avatar-open')) return;
    const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length; 
    slideTo(newIndex, -1); 
  });
  nextArrow.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (lightbox.classList.contains('avatar-open')) return;
    const newIndex = (currentImageIndex + 1) % allImages.length; 
    slideTo(newIndex, 1); 
  });

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxContent) closeLightbox(); });

  avatarImg.addEventListener('click', function() {
    lbImage.src = this.src;
    lbImage.alt = "Enlarged view of Mohamed Tammam's avatar";
    lbImageNext.style.display = 'none';
    lightbox.classList.add('open', 'avatar-open');
    document.body.classList.add('lightbox-is-open');
  });
  
  lbImage.addEventListener('click', () => {
    if (lightbox.classList.contains('avatar-open')) {
      closeLightbox();
    }
  });

  nameEl.innerHTML = nameEl.textContent.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  nameEl.addEventListener('click', () => {
    nameEl.querySelectorAll('span').forEach((span, i) => {
      setTimeout(() => span.classList.add('bounce'), i * 50);
      setTimeout(() => span.classList.remove('bounce'), 1000 + i * 50);
    });
  });

  function showSection(sectionId) {
    sections.forEach(section => { section.classList.remove('active'); });
    const el = document.getElementById(sectionId);
    if (el) { el.classList.add('active'); }
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
  }

  function handleNavigation() {
    const hash = window.location.hash;
    const sectionId = hash.startsWith('#image/') ? 'portfolio' : (hash.substring(1) || 'portfolio');
    showSection(sectionId);
  }

  function typeWriter() {
    const currentRole = roles[roleIndex];
    const targetText = currentRole;
    
    if (deleting) {
      if(cursorEl) cursorEl.style.opacity = 0;
      roleEl.textContent = targetText.substring(0, charIndex);
      charIndex--;
      if (charIndex < 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        if(cursorEl) cursorEl.style.opacity = 1; 
      }
    } else {
      if(cursorEl) cursorEl.style.opacity = 0; 
      roleEl.textContent += targetText.charAt(charIndex);
      charIndex++;
      if (charIndex > targetText.length) {
        deleting = true;
        charIndex = targetText.length;
        if(cursorEl) cursorEl.style.opacity = 1; 
      }
    }
    const delay = deleting ? 100 : 150;
    setTimeout(typeWriter, delay);
  }

  function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function loadImages(category = 'all') {
    gallery.innerHTML = '<p>Loading gallery...</p>';
    let query = db.collection("portfolioimages").orderBy("timestamp", "desc");
    if (category !== 'all') { query = query.where("category", "==", category); }
    try {
      const querySnapshot = await query.get();
      allImages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderGallery();
      const urlHash = window.location.hash;
      if (urlHash.startsWith('#image/')) {
        const imageId = urlHash.substring(7);
        const imageIndex = allImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) { openLightbox(imageIndex); }
      }
    } catch (error) {
      console.error("Error loading images:", error);
      gallery.innerHTML = "<p>Failed to load gallery. Please try again later.</p>";
    }
  }

  function renderGallery() {
    gallery.innerHTML = '';
    if (allImages.length === 0) {
      gallery.innerHTML = "<p>No images found in this category.</p>";
      return;
    }
    allImages.forEach((imgObj, index) => {
      const card = createImageCard(imgObj, index);
      gallery.appendChild(card);
    });
    observeSections();
  }
  
  // (تعديل كلي) تغيير طريقة التحميل بالكامل لتكون أكثر توافقية
  function downloadImage(src, title) {
    // نقوم بإضافة معامل 'fl_attachment' إلى رابط الصورة
    // هذا المعامل يخبر Cloudinary أن يجبر المتصفح على تحميل الصورة
    const urlParts = src.split('/upload/');
    if (urlParts.length !== 2) {
      // إذا كان الرابط غير متوقع، افتحه في نافذة جديدة كحل بديل
      window.open(src, '_blank');
      return;
    }
    const downloadUrl = `${urlParts[0]}/upload/fl_attachment/${urlParts[1]}`;

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;

    // مع أن Cloudinary ستجبر التحميل، من الجيد اقتراح اسم للملف
    const extension = src.split('.').pop().split('?')[0] || 'jpg';
    a.download = `${title.replace(/ /g, '_')}.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.transitionDelay = `${index * 0.05}s`; 
    const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);
    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
      <div class="title-container"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
      <div class="card-actions">
        <span class="like-count">${imgObj.likes || 0}</span>
        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" aria-label="Like this image">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
        </button>
        <button class="action-btn download-btn" aria-label="Download this image">
            <i class="fas fa-download" aria-hidden="true"></i>
        </button>
        <button class="action-btn delete-btn" aria-label="Delete this image">
            <i class="fas fa-trash" aria-hidden="true"></i>
        </button>
      </div>
      <div class="comments-section">
        <div class="comments-list">${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment)}</span></div>`).join('')}</div>
        <form class="comment-form">
          <label for="comment-input-${index}" class="visually-hidden">Add a comment</label>
          <input id="comment-input-${index}" class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
          <button class="comment-btn" type="submit" aria-label="Submit comment"><i class="fas fa-paper-plane"></i></button>
        </form>
      </div>`;
      
    card.querySelector('.thumb img').addEventListener('click', () => openLightbox(index));
    
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => {
      const likeCountEl = card.querySelector('.like-count');
      toggleLike(imgObj.id, likeBtn, likeCountEl);
    });

    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
      downloadImage(imgObj.src, imgObj.title || 'Artwork');
    });
    
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        deleteImage(imgObj.id, card);
    });

    const commentForm = card.querySelector('.comment-form');
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const commentInput = card.querySelector('.comment-input');
      const commentsList = card.querySelector('.comments-list');
      addComment(imgObj.id, commentInput, commentsList);
    });

    return card;
  }

  async function deleteImage(imageId, cardElement) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الصورة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    try {
        await db.collection('portfolioimages').doc(imageId).delete();
        cardElement.style.transition = 'opacity 0.5s, transform 0.5s';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.9)';
        setTimeout(() => {
            cardElement.remove();
        }, 500);
    } catch (error) {
        console.error("Error deleting image: ", error);
        alert('حدث خطأ أثناء محاولة حذف الصورة.');
    }
  }

  async function toggleLike(imageId, likeBtn, likeCountEl) {
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(imageRef);
            if (!doc.exists) return;
            const { likedBy = [], likes = 0 } = doc.data();
            const icon = likeBtn.querySelector('i');
            let newLikes = likes;
            if (likedBy.includes(visitorId)) {
                newLikes--;
                likedBy.splice(likedBy.indexOf(visitorId), 1);
                likeBtn.classList.remove('liked');
                icon.classList.replace('fas', 'far');
            } else {
                newLikes++;
                likedBy.push(visitorId);
                likeBtn.classList.add('liked');
                icon.classList.replace('far', 'fas');
            }
            transaction.update(imageRef, { likes: newLikes, likedBy });
            likeCountEl.textContent = newLikes;
        });
    } catch (error) { console.error("Failed to toggle like:", error); }
  }

  async function addComment(imageId, inputEl, commentsListEl) {
    const commentText = inputEl.value.trim();
    if (!commentText) return;
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
      await imageRef.update({
        comments: firebase.firestore.FieldValue.arrayUnion(commentText)
      });
      const newCommentDiv = document.createElement('div');
      newCommentDiv.className = 'comment';
      newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`;
      commentsListEl.appendChild(newCommentDiv);
      commentsListEl.scrollTop = commentsListEl.scrollHeight;
      inputEl.value = '';
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("An unexpected error occurred. Could not add comment.");
    }
  }

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      loadImages(button.dataset.category);
    });
  });

  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    });

    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  function observeSections() {
    document.querySelectorAll('section h2, .about-content').forEach(el => {
      observer.observe(el);
    });
    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card);
    });
  }

  const portfolioTitle = document.getElementById('portfolioTitle');
  if (portfolioTitle) {
    const text = "Portfolio";
    portfolioTitle.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.innerHTML = char === ' ' ? '&nbsp;' : char;
      portfolioTitle.appendChild(span);
    });
    portfolioTitle.addEventListener('click', () => {
      const isActive = portfolioTitle.classList.toggle('glitching');
      if (isActive) {
        document.body.classList.add('screen-shake-active');
        setTimeout(() => {
          document.body.classList.remove('screen-shake-active');
        }, 400);
        portfolioTitle.querySelectorAll('span').forEach(span => {
            span.style.color = '#fff';
        });
      } else {
        portfolioTitle.querySelectorAll('span').forEach(span => {
            span.style.color = 'var(--neon-off-color)';
        });
      }
    });
  }

  const lightbulbScene = document.getElementById('lightbulbScene');
  const svg = document.getElementById('lightbulbSvg');
  if (svg) {
    function toggleTheme() {
      const isLightTheme = document.body.classList.toggle('light-mode');
      svg.classList.toggle('on', !isLightTheme);
      localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      svg.classList.remove('on');
    } else {
      svg.classList.add('on');
    }
    if (lightbulbScene && typeof Matter !== 'undefined') {
      const bulbGroup = document.getElementById('bulbGroup');
      const cord = document.getElementById('cord');
      const { Engine, World, Bodies, Constraint, Mouse, MouseConstraint } = Matter;
      const engine = Engine.create();
      engine.world.gravity.scale = 0.001;
      const bulbBody = Bodies.circle(50, 100, 25, { restitution: 0.5, friction: 0.1, frictionAir: 0.05 });
      const constraint = Constraint.create({ pointA: { x: 50, y: 0 }, bodyB: bulbBody, length: 100, stiffness: 0.2, damping: 0.25 });
      World.add(engine.world, [bulbBody, constraint]);
      const mouse = Mouse.create(lightbulbScene);
      const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.8, render: { visible: false } } });
      World.add(engine.world, mouseConstraint);
      (function render() {
        const bulbPos = bulbBody.position;
        bulbGroup.setAttribute('transform', `translate(${bulbPos.x - 50}, ${bulbPos.y - 125})`);
        cord.setAttribute('x2', bulbPos.x);
        cord.setAttribute('y2', bulbPos.y);
        Engine.update(engine, 1000 / 60);
        requestAnimationFrame(render);
      })();
      let dragStartPos = { x: 0, y: 0 }, isDragging = false;
      mouse.element.addEventListener('mousedown', (e) => { isDragging = true; dragStartPos = { x: e.clientX, y: e.clientY }; });
      mouse.element.addEventListener('touchstart', (e) => { isDragging = true; dragStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
      document.addEventListener('mouseup', (e) => {
        if (isDragging && mouseConstraint.body !== null) {
          const dragEndPos = { x: e.clientX, y: e.clientY };
          const dragDistance = Math.sqrt(Math.pow(dragEndPos.x - dragStartPos.x, 2) + Math.pow(dragEndPos.y - dragStartPos.y, 2));
          if (dragDistance > 5) { toggleTheme(); }
          isDragging = false;
        }
      });
      document.addEventListener('touchend', (e) => {
        if (isDragging && mouseConstraint.body !== null) {
          const dragEndPos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
          const dragDistance = Math.sqrt(Math.pow(dragEndPos.x - dragStartPos.x, 2) + Math.pow(dragEndPos.y - dragStartPos.y, 2));
          if (dragDistance > 5) { toggleTheme(); }
          isDragging = false;
        }
      });
    } else {
      const bulbGroup = document.getElementById('bulbGroup');
      if (bulbGroup) {
        bulbGroup.addEventListener('click', toggleTheme);
      }
    }
  }

  // --- Admin Logic ---
  function setupAdmin() {
    auth.onAuthStateChanged(user => {
      if (user) {
        document.body.classList.add('admin-logged-in');
        adminPanel.style.display = 'block';
        loginContainer.style.display = 'none';
      } else {
        document.body.classList.remove('admin-logged-in');
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'block';
      }
    });

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.email.value;
      const password = loginForm.password.value;
      auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
          console.error('Login Error:', error);
          alert(error.message);
        });
    });

    logoutBtn.addEventListener('click', () => {
      auth.signOut();
    });

    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = 'block';
      }
    });

    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = uploadForm.imageTitle.value;
      const category = uploadForm.imageCategory.value;
      const file = uploadForm.imageFile.files[0];
      const uploadButton = uploadForm.querySelector('#submitUpload');

      if (!file || !title || !category) {
        alert('Please fill all fields and select a file.');
        return;
      }

      uploadButton.textContent = 'Uploading...';
      uploadButton.disabled = true;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'Mohamed');

      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dswtpqdsh/image/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Cloudinary upload failed');
        }

        const data = await response.json();
        const imageUrl = data.secure_url;

        await db.collection('portfolioimages').add({
          title: title,
          category: category,
          src: imageUrl,
          likes: 0,
          likedBy: [],
          comments: [],
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Image uploaded successfully!');
        uploadForm.reset();
        imagePreview.style.display = 'none';
        loadImages();

      } catch (error) {
        console.error('Upload Error:', error);
        alert('An error occurred during upload. Please check console for details.');
      } finally {
        uploadButton.textContent = 'Upload Image';
        uploadButton.disabled = false;
      }
    });
  }
  
  // --- Initialize ---
  handleNavigation();
  loadImages();
  typeWriter();
  setupAdmin();
});
