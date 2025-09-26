const firebaseConfig = {
  // ▼▼▼ انسخ هاتين القيمتين من شاشة إعدادات مشروعك الجديد ▼▼▼
  apiKey: "YOUR_NEW_API_KEY", 
  messagingSenderId: "YOUR_NEW_SENDER_ID",
  // ▲▲▲ انسخ هاتين القيمتين من شاشة إعدادات مشروعك الجديد ▲▲▲

  projectId: "mo666-a7694",
  authDomain: "mo666-a7694.firebaseapp.com",
  storageBucket: "mo666-a7694.appspot.com",
  appId: "1:698308460915:web:cd78096121966102f60506"
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

  // --- Audio Elements ---
  const clickSound = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3');
  const switchSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_b80283288f.mp3');
  const openSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3894441b0.mp3');
  const closeSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/25/audio_331c11d130.mp3');
  
  clickSound.volume = 0.5;
  switchSound.volume = 0.6;
  openSound.volume = 0.4;
  closeSound.volume = 0.4;

  let audioUnlocked = false;
  function unlockAudioContext() {
    if (audioUnlocked) return;
    const sounds = [clickSound, switchSound, openSound, closeSound];
    sounds.forEach(sound => sound.load());
    audioUnlocked = true;
  }
  document.addEventListener('click', unlockAudioContext, { once: true });
  document.addEventListener('touchstart', unlockAudioContext, { once: true });

  function playSound(sound) {
    if (!audioUnlocked) return;
    sound.currentTime = 0;
    sound.play().catch(error => console.log(`Audio playback was prevented: ${error}`));
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
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminLoginModal = document.getElementById('adminLoginModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');
  const addImageBtn = document.querySelector('.add-image-btn');
  const googleSignInBtn = document.getElementById('googleSignInBtn');

  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  let isTransitioning = false;
  let isAdmin = false;
  const ADMIN_EMAIL = "p7ilosop7y@gmail.com";

  // --- Admin & Auth Functions ---

  const myWidget = cloudinary.createUploadWidget({
    cloudName: 'dswtpqdsh',
    uploadPreset: 'Mohamed',
    apiKey: '835478547497821', 
    folder: 'portfolio',
    cropping: true,
    sources: ['local', 'url', 'camera'],
    multiple: false,
    maxFiles: 1,
    styles: { palette: { window: "var(--bg)", windowBorder: "var(--card-border)", tabIcon: "var(--accent)", menuIcons: "var(--text)", textDark: "var(--muted)", textLight: "var(--text)", link: "var(--accent)", action: "var(--accent)", inactiveTabIcon: "var(--muted)", error: "#F44235", inProgress: "var(--accent)", complete: "#20B832", sourceBg: "var(--bg)" } }
  }, (error, result) => { 
    if (!error && result && result.event === "success") { 
      addNewImage(result.info.secure_url);
    }
  });

  async function addNewImage(imageUrl) {
    const title = prompt("الرجاء إدخال عنوان الصورة:", "بدون عنوان");
    const category = prompt("الرجاء إدخال التصنيف (illustration, concept, character):", "illustration");
    if (title === null || category === null) return;
    try {
      await db.collection("portfolioimages").add({
        src: imageUrl,
        title: title,
        category: category.toLowerCase().trim(),
        likes: 0,
        likedBy: [],
        comments: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert('تمت إضافة الصورة بنجاح!');
      loadImages();
    } catch (error) {
      console.error("خطأ في إضافة الصورة إلى Firestore: ", error);
      alert('فشلت إضافة الصورة.');
    }
  }

  function updateAdminUI() {
    if (isAdmin) {
      addImageBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'block';
      logoutBtnMobile.style.display = 'block';
      adminLoginBtn.style.display = 'none';
    } else {
      addImageBtn.style.display = 'none';
      logoutBtn.style.display = 'none';
      logoutBtnMobile.style.display = 'none';
      adminLoginBtn.style.display = 'block';
    }
  }

  function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then((result) => {
        adminLoginModal.style.display = 'none';
        console.log(result.user.email + " signed in.");
      }).catch((error) => {
        console.error("Google sign-in error", error);
        alert("فشل تسجيل الدخول. الرجاء المحاولة مرة أخرى.");
      });
  }

  function signOut() {
    auth.signOut().then(() => {
      console.log("User signed out.");
    }).catch((error) => {
      console.error("Sign out error", error);
    });
  }
  
  auth.onAuthStateChanged(user => {
    if (user && user.email === ADMIN_EMAIL) {
      isAdmin = true;
    } else {
      isAdmin = false;
    }
    updateAdminUI();
  });

  // --- Menu ---
  function openMenu() { playSound(openSound); sideMenu.classList.add('open'); menuOverlay.classList.add('open'); }
  function closeMenu() { playSound(closeSound); sideMenu.classList.remove('open'); menuOverlay.classList.remove('open'); }
  
  let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
  document.addEventListener('touchstart', e => { if (e.target.closest('#lightbox')) return; touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive: true });
  document.addEventListener('touchend', e => { if (e.target.closest('#lightbox')) return; touchEndX = e.changedTouches[0].screenX; touchEndY = e.changedTouches[0].screenY; handleMenuSwipe(); });
  
  function handleMenuSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const swipeThreshold = 50;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) openMenu();
        else closeMenu();
      }
    }
  }

  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;
  navLinks.forEach(link => {
    link.addEventListener('click', () => { playSound(clickSound); closeMenu(); const href = link.getAttribute('href'); if (href.startsWith('#')) { showSection(href.substring(1)); } });
  });
  
  // --- Lightbox ---
  let scale = 1, isZoomed = false; let panStartX, panStartY, translateX = 0, translateY = 0; let lastTap = 0; let swipeLbStartX = 0, swipeLbStartY = 0, swipeLbCurrentX = 0, swipeLbCurrentY = 0; let isLightboxSwiping = false, lightboxSwipeDirection = null; const swipeThresholdX = 50, swipeThresholdY = 80;

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    resetZoom(); currentImageIndex = index; const img = allImages[index]; lbImage.src = img.src; lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`; lbImageNext.style.display = 'none'; lbImage.style.opacity = 1; lightbox.style.backgroundColor = ''; lightbox.classList.add('open'); document.body.style.overflow = 'hidden'; document.body.classList.add('lightbox-is-open'); const imageUrl = `#image/${img.id}`; if (window.location.hash !== imageUrl) { history.pushState({ lightbox: 'open' }, '', imageUrl); }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open', 'zoomed'); document.body.style.overflow = 'auto'; document.body.classList.remove('lightbox-is-open'); setTimeout(() => { lightbox.style.backgroundColor = ''; applyTransform(lbImage, 0, 0, 1); }, 300); if (window.location.hash.startsWith('#image/')) { history.pushState("", document.title, window.location.pathname + window.location.search); }
  }

  function applyTransform(element, x, y, s) { element.style.transform = `translate(${x}px, ${y}px) scale(${s})`; }
  function resetZoom() { scale = 1; translateX = 0; translateY = 0; isZoomed = false; lightbox.classList.remove('zoomed'); lbImage.style.transition = 'transform 0.3s ease-out'; applyTransform(lbImage, 0, 0, 1); setTimeout(() => { lbImage.style.transition = 'none'; }, 300); }
  function toggleZoom(e) {
    if (isZoomed) { resetZoom(); } else { const rect = lbImage.getBoundingClientRect(); const originX = (e.clientX || e.touches[0].clientX) - rect.left; const originY = (e.clientY || e.touches[0].clientY) - rect.top; lbImage.style.transformOrigin = `${originX}px ${originY}px`; scale = 2.5; isZoomed = true; lightbox.classList.add('zoomed'); lbImage.style.transition = 'transform 0.3s ease-out'; applyTransform(lbImage, translateX, translateY, scale); setTimeout(() => { lbImage.style.transition = 'none'; }, 300); }
  }
  
  function slideTo(newIndex, direction) {
    if (isTransitioning) return;
    isTransitioning = true; lbImageNext.src = allImages[newIndex].src; lbImageNext.style.display = 'block'; const initialNextX = direction === 1 ? window.innerWidth : -window.innerWidth; applyTransform(lbImageNext, initialNextX, 0, 1); lbImage.style.transition = 'transform 0.3s ease-out'; lbImageNext.style.transition = 'transform 0.3s ease-out'; const finalCurrentImageX = direction === 1 ? -window.innerWidth : window.innerWidth; applyTransform(lbImage, finalCurrentImageX, 0, 1); applyTransform(lbImageNext, 0, 0, 1);
    setTimeout(() => { currentImageIndex = newIndex; const newImgData = allImages[currentImageIndex]; lbImage.src = newImgData.src; lbImage.alt = `Enlarged view of ${escapeHtml(newImgData.title || 'artwork')}`; history.replaceState({ lightbox: 'open' }, '', `#image/${newImgData.id}`); lbImage.style.transition = 'none'; lbImageNext.style.transition = 'none'; applyTransform(lbImage, 0, 0, 1); lbImageNext.style.display = 'none'; isTransitioning = false; }, 300);
  }

  function onLightboxTouchStart(e) { if (isTransitioning) return; lbImage.style.transition = 'none'; lbImageNext.style.transition = 'none'; if (e.touches.length === 1) { const { clientX, clientY } = e.touches[0]; if (isZoomed) { panStartX = clientX - translateX; panStartY = clientY - translateY; } else { isLightboxSwiping = true; swipeLbStartX = clientX; swipeLbStartY = clientY; swipeLbCurrentX = clientX; swipeLbCurrentY = clientY; lightboxSwipeDirection = null; } const now = Date.now(); if (now - lastTap < 300) { e.preventDefault(); toggleZoom(e); } lastTap = now; } }
  function onLightboxTouchMove(e) { if (isTransitioning || !isLightboxSwiping) return; e.preventDefault(); if (e.touches.length === 1) { if (isZoomed) { const { clientX, clientY } = e.touches[0]; translateX = clientX - panStartX; translateY = clientY - panStartY; applyTransform(lbImage, translateX, translateY, scale); return; } swipeLbCurrentX = e.touches[0].clientX; swipeLbCurrentY = e.touches[0].clientY; const diffX = swipeLbCurrentX - swipeLbStartX; const diffY = swipeLbCurrentY - swipeLbStartY; if (!lightboxSwipeDirection) { if (Math.abs(diffY) > 5 && Math.abs(diffY) > Math.abs(diffX)) { lightboxSwipeDirection = 'vertical'; } else if (Math.abs(diffX) > 5) { lightboxSwipeDirection = 'horizontal'; } } if (lightboxSwipeDirection === 'vertical' && diffY < 0) { const progress = Math.abs(diffY) / (window.innerHeight / 2); const newScale = Math.max(0.7, 1 - progress * 0.3); const newOpacity = Math.max(0.1, 1 - progress); applyTransform(lbImage, 0, diffY, newScale); lightbox.style.backgroundColor = `rgba(0, 0, 0, ${0.9 * newOpacity})`; } else if (lightboxSwipeDirection === 'horizontal') { if (lightbox.classList.contains('avatar-open')) return; const navDirection = diffX < 0 ? 1 : -1; const nextIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length; lbImageNext.src = allImages[nextIndex].src; lbImageNext.style.display = 'block'; applyTransform(lbImage, diffX, 0, 1); const nextImageX = (navDirection === 1 ? window.innerWidth : -window.innerWidth) + diffX; applyTransform(lbImageNext, nextImageX, 0, 1); } } }
  function onLightboxTouchEnd(e) { if (!isLightboxSwiping) return; isLightboxSwiping = false; if (lightboxSwipeDirection === 'vertical') { const diffY = swipeLbCurrentY - swipeLbStartY; if (diffY < -swipeThresholdY) { closeLightbox(); } else { lbImage.style.transition = 'transform 0.3s ease-out'; lightbox.style.transition = 'background-color 0.3s ease-out'; applyTransform(lbImage, 0, 0, 1); lightbox.style.backgroundColor = ''; setTimeout(() => { lightbox.style.transition = 'none'; }, 300); } } else if (lightboxSwipeDirection === 'horizontal') { if (lightbox.classList.contains('avatar-open')) return; const diffX = swipeLbCurrentX - swipeLbStartX; const navDirection = diffX < 0 ? 1 : -1; if (Math.abs(diffX) > swipeThresholdX) { const newIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length; slideTo(newIndex, navDirection); } else { lbImage.style.transition = 'transform 0.3s ease-out'; lbImageNext.style.transition = 'transform 0.3s ease-out'; applyTransform(lbImage, 0, 0, 1); const nextImageX = navDirection === 1 ? window.innerWidth : -window.innerWidth; applyTransform(lbImageNext, nextImageX, 0, 1); } } lightboxSwipeDirection = null; }

  lightboxContent.addEventListener('touchstart', onLightboxTouchStart, { passive: false });
  lightboxContent.addEventListener('touchmove', onLightboxTouchMove, { passive: false });
  lightboxContent.addEventListener('touchend', onLightboxTouchEnd, { passive: false });
  
  prevArrow.onclick = (e) => { playSound(clickSound); e.stopPropagation(); if (lightbox.classList.contains('avatar-open')) return; const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length; slideTo(newIndex, -1); };
  nextArrow.onclick = (e) => { playSound(clickSound); e.stopPropagation(); if (lightbox.classList.contains('avatar-open')) return; const newIndex = (currentImageIndex + 1) % allImages.length; slideTo(newIndex, 1); };
  lightbox.onclick = (e) => { if (e.target === lightbox || e.target === lightboxContent) closeLightbox(); };
  avatarImg.onclick = function() { playSound(clickSound); lbImage.src = this.src; lbImage.alt = "Enlarged view of Mohamed Tammam's avatar"; lbImageNext.style.display = 'none'; lightbox.classList.add('open', 'avatar-open'); document.body.classList.add('lightbox-is-open'); };
  lbImage.onclick = () => { if (lightbox.classList.contains('avatar-open')) closeLightbox(); };

  // --- UI & Content ---
  nameEl.innerHTML = nameEl.textContent.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  nameEl.onclick = () => { playSound(clickSound); nameEl.querySelectorAll('span').forEach((span, i) => { setTimeout(() => span.classList.add('bounce'), i * 50); setTimeout(() => span.classList.remove('bounce'), 1000 + i * 50); }); };
  function showSection(sectionId) { sections.forEach(section => { section.classList.remove('active'); }); const el = document.getElementById(sectionId); if (el) el.classList.add('active'); }
  function handleNavigation() { const hash = window.location.hash; const sectionId = hash.startsWith('#image/') ? 'portfolio' : (hash.substring(1) || 'portfolio'); showSection(sectionId); }
  function typeWriter() { const currentRole = roles[roleIndex]; if (!deleting && charIndex < currentRole.length) { roleEl.textContent += currentRole.charAt(charIndex++); } else if (deleting && charIndex > 0) { roleEl.textContent = currentRole.substring(0, --charIndex); } else { deleting = !deleting; if (!deleting) { roleIndex = (roleIndex + 1) % roles.length; } } setTimeout(typeWriter, deleting ? 100 : 150); }
  function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  // --- Gallery & Firestore ---
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
        if (imageIndex !== -1) openLightbox(imageIndex);
      }
    } catch (error) { console.error("Error loading images:", error); gallery.innerHTML = "<p>Failed to load gallery.</p>"; }
  }

  function renderGallery() {
    gallery.innerHTML = '';
    if (allImages.length === 0) { gallery.innerHTML = "<p>No images found in this category.</p>"; return; }
    allImages.forEach((imgObj, index) => { const card = createImageCard(imgObj, index); gallery.appendChild(card); });
    observeElements(document.querySelectorAll('.card'));
  }
  
  async function downloadImage(src, title, buttonEl) {
    const originalIcon = buttonEl.innerHTML; buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; buttonEl.disabled = true;
    try { const response = await fetch(src); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; const extension = src.split('.').pop().split('?')[0] || 'jpg'; a.download = `${title.replace(/ /g, '_')}.${extension}`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
    } catch (e) { console.error('Download failed:', e); alert('فشل تحميل الصورة.');
    } finally { buttonEl.innerHTML = originalIcon; buttonEl.disabled = false; }
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div'); card.className = 'card'; const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);
    card.innerHTML = `<div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div><div class="title-container"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div><div class="card-actions"><span class="like-count">${imgObj.likes || 0}</span><button class="action-btn like-btn ${isLiked ? 'liked' : ''}" aria-label="Like"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i></button><button class="action-btn download-btn" aria-label="Download"><i class="fas fa-download"></i></button></div><div class="comments-section"><div class="comments-list">${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment)}</span></div>`).join('')}</div><form class="comment-form"><label for="comment-input-${index}" class="visually-hidden">Add comment</label><input id="comment-input-${index}" class="comment-input" type="text" placeholder="أضف تعليقًا..." required><button class="comment-btn" type="submit" aria-label="Submit comment"><i class="fas fa-paper-plane"></i></button></form></div>`;
    card.querySelector('.thumb img').onclick = () => openLightbox(index);
    const likeBtn = card.querySelector('.like-btn'); const likeCountEl = card.querySelector('.like-count');
    likeBtn.onclick = () => { playSound(clickSound); toggleLike(imgObj.id, likeBtn, likeCountEl); };
    card.querySelector('.download-btn').onclick = () => { playSound(clickSound); downloadImage(imgObj.src, imgObj.title || 'Artwork', card.querySelector('.download-btn')); };
    const commentForm = card.querySelector('.comment-form'); card.querySelector('.comment-btn').onclick = () => playSound(clickSound);
    commentForm.onsubmit = (e) => { e.preventDefault(); const commentInput = card.querySelector('.comment-input'); const commentsList = card.querySelector('.comments-list'); addComment(imgObj.id, commentInput, commentsList); };
    return card;
  }

  async function toggleLike(imageId, likeBtn, likeCountEl) {
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(imageRef); if (!doc.exists) return;
            const { likedBy = [], likes = 0 } = doc.data(); const icon = likeBtn.querySelector('i'); let newLikes = likes;
            if (likedBy.includes(visitorId)) { newLikes--; likedBy.splice(likedBy.indexOf(visitorId), 1); likeBtn.classList.remove('liked'); icon.classList.replace('fas', 'far');
            } else { newLikes++; likedBy.push(visitorId); likeBtn.classList.add('liked'); icon.classList.replace('far', 'fas'); }
            transaction.update(imageRef, { likes: newLikes, likedBy }); likeCountEl.textContent = newLikes;
        });
    } catch (error) { console.error("Failed to toggle like:", error); }
  }

  async function addComment(imageId, inputEl, commentsListEl) {
    const commentText = inputEl.value.trim(); if (!commentText) return;
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
      await imageRef.update({ comments: firebase.firestore.FieldValue.arrayUnion(commentText) });
      const newCommentDiv = document.createElement('div'); newCommentDiv.className = 'comment'; newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`; commentsListEl.appendChild(newCommentDiv); commentsListEl.scrollTop = commentsListEl.scrollHeight; inputEl.value = '';
    } catch (error) { console.error("Error adding comment:", error); alert("Could not add comment."); }
  }

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.onclick = () => { playSound(clickSound); document.querySelector('.filter-btn.active').classList.remove('active'); button.classList.add('active'); loadImages(button.dataset.category); };
  });

  if (scrollToTopBtn) { window.onscroll = () => { if (window.scrollY > 300) scrollToTopBtn.classList.add('visible'); else scrollToTopBtn.classList.remove('visible'); }; scrollToTopBtn.onclick = () => { playSound(openSound); window.scrollTo({ top: 0, behavior: 'smooth' }); }; }
  
  const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }); }, { threshold: 0.1 });
  function observeElements(elements) { elements.forEach(el => { observer.observe(el); }); } observeElements(document.querySelectorAll('section h2, .about-content'));

  const portfolioTitle = document.getElementById('portfolioTitle');
  if (portfolioTitle) {
    const text = "Portfolio"; portfolioTitle.innerHTML = ''; text.split('').forEach(char => { const span = document.createElement('span'); span.innerHTML = char === ' ' ? '&nbsp;' : char; portfolioTitle.appendChild(span); });
    let isAnimating = false;
    portfolioTitle.onclick = () => { playSound(clickSound); if (isAnimating) return; isAnimating = true; portfolioTitle.classList.add('glitching'); setTimeout(() => { portfolioTitle.classList.remove('glitching'); isAnimating = false; }, 2000); };
  }

  const lightbulbScene = document.getElementById('lightbulbScene'); const svg = document.getElementById('lightbulbSvg');
  if (svg) {
    function toggleTheme() { playSound(switchSound); const isLightTheme = document.body.classList.toggle('light-mode'); svg.classList.toggle('on', !isLightTheme); localStorage.setItem('theme', isLightTheme ? 'light' : 'dark'); }
    const savedTheme = localStorage.getItem('theme'); if (savedTheme === 'light') { document.body.classList.add('light-mode'); svg.classList.remove('on'); } else { svg.classList.add('on'); }
    if (lightbulbScene && typeof Matter !== 'undefined') {
      const { Engine, World, Bodies, Constraint, Mouse, MouseConstraint } = Matter; const engine = Engine.create(); engine.world.gravity.scale = 0.001;
      const bulbBody = Bodies.circle(50, 100, 25, { restitution: 0.5, friction: 0.1, frictionAir: 0.05 }); const constraint = Constraint.create({ pointA: { x: 50, y: 0 }, bodyB: bulbBody, length: 100, stiffness: 0.2, damping: 0.25 }); World.add(engine.world, [bulbBody, constraint]);
      const mouse = Mouse.create(lightbulbScene); const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.8, render: { visible: false } } }); World.add(engine.world, mouseConstraint);
      (function render() { const bulbPos = bulbBody.position; document.getElementById('bulbGroup').setAttribute('transform', `translate(${bulbPos.x - 50}, ${bulbPos.y - 125})`); document.getElementById('cord').setAttribute('x2', bulbPos.x); document.getElementById('cord').setAttribute('y2', bulbPos.y); Engine.update(engine, 1000 / 60); requestAnimationFrame(render); })();
      let dragStartPos = { x: 0, y: 0 }, isDragging = false;
      mouse.element.onmousedown = (e) => { isDragging = true; dragStartPos = { x: e.clientX, y: e.clientY }; };
      document.onmouseup = (e) => { if (isDragging && mouseConstraint.body !== null) { const dragDistance = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y); if (dragDistance < 5) toggleTheme(); isDragging = false; } };
    } else { if (document.getElementById('bulbGroup')) { document.getElementById('bulbGroup').onclick = toggleTheme; } }
  }

  // --- Initializations ---
  
  if (addImageBtn) addImageBtn.onclick = () => { if (isAdmin) myWidget.open(); };
  if (googleSignInBtn) googleSignInBtn.onclick = signInWithGoogle;
  if (adminLoginBtn) adminLoginBtn.onclick = () => { playSound(openSound); if(adminLoginModal) adminLoginModal.style.display = 'flex'; };
  if (closeModalBtn) closeModalBtn.onclick = () => { playSound(closeSound); if(adminLoginModal) adminLoginModal.style.display = 'none'; };
  if (adminLoginModal) adminLoginModal.onclick = (e) => { if(e.target === adminLoginModal) { playSound(closeSound); adminLoginModal.style.display = 'none'; } };
  if (logoutBtn) logoutBtn.onclick = signOut;
  if (logoutBtnMobile) logoutBtnMobile.onclick = () => { closeMenu(); signOut(); };
  
  handleNavigation();
  loadImages();
  typeWriter();
});
