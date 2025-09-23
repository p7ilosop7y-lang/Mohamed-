// script.js (Final Version with Partial Swipe Reveal)

const firebaseConfig = {
  apiKey: "AIzaSyB5WZP74RfeYoPv_kHXRhNtDYzRp2dOPeU",
  authDomain: "mo777-2b57e.firebaseapp.com",
  projectId: "mo777-2b57e",
  storageBucket: "mo777-2b57e.firebasestorage.app",
  messagingSenderId: "318111712614",
  appId: "1:318111712614:web:460e225f4f429c7f13f4a7"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

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
  const lbImage = document.getElementById('lbImage');
  const lbImageNext = document.getElementById('lbImageNext'); // New element
  const authBtn = document.getElementById('auth-btn');
  const addImageBtn = document.getElementById('addImageBtn');
  const prevArrow = document.getElementById('prevArrow');
  const nextArrow = document.getElementById('nextArrow');

  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  let isTransitioning = false;

  // --- Functions ---

  function openMenu() { sideMenu.classList.add('open'); menuOverlay.classList.add('open'); }
  function closeMenu() { sideMenu.classList.remove('open'); menuOverlay.classList.remove('open'); }

  function showSection(sectionId) {
    sections.forEach(section => { section.style.display = 'none'; section.classList.remove('active'); });
    const el = document.getElementById(sectionId);
    if (el) { el.style.display = 'block'; el.classList.add('active'); }
  }

  function handleNavigation() {
    const hash = window.location.hash;
    showSection(hash.startsWith('#image/') ? 'portfolio' : (hash.substring(1) || 'portfolio'));
  }

  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) { roleEl.textContent += currentRole.charAt(charIndex++); }
    else if (deleting && charIndex > 0) { roleEl.textContent = currentRole.substring(0, --charIndex); }
    else { deleting = !deleting; if (!deleting) { roleIndex = (roleIndex + 1) % roles.length; } }
    setTimeout(typeWriter, deleting ? 100 : 150);
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
      card.style.animationDelay = `${index * 0.05}s`;
      gallery.appendChild(card);
    });
  }
  
  async function downloadImage(src, title, buttonEl) {
    const originalIcon = buttonEl.innerHTML;
    buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonEl.disabled = true;
    
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const extension = src.split('.').pop().split('?')[0] || 'jpg';
        a.download = `${title.replace(/ /g, '_')}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e) {
        console.error('Download failed:', e);
        alert('فشل تحميل الصورة.');
    } finally {
        buttonEl.innerHTML = originalIcon;
        buttonEl.disabled = false;
    }
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
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
    const likeCountEl = card.querySelector('.like-count');
    likeBtn.addEventListener('click', () => toggleLike(imgObj.id, likeBtn, likeCountEl));
    
    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => downloadImage(imgObj.src, imgObj.title || 'Artwork', downloadBtn));

    const commentForm = card.querySelector('.comment-form');
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const commentInput = card.querySelector('.comment-input');
      const commentsList = card.querySelector('.comments-list');
      addComment(imgObj.id, commentInput, commentsList);
    });
    return card;
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
    } catch (error) {
        console.error("Failed to toggle like:", error);
    }
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

  // =======================================================================
  // === آلية تكبير الصور والانتقال الجديدة (Zoom/Pan/Slide) ===
  // =======================================================================
  const lightboxContent = document.getElementById('lightboxContent');
  let scale = 1, isZoomed = false;
  let startX, startY, translateX = 0, translateY = 0;
  let lastTap = 0, initialDistance = 0, initialScale = 1;
  let swipeStartX = 0, swipeCurrentX = 0, isSwiping = false, swipeDirection = 0;
  const swipeThreshold = 50;


  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    
    resetZoom();
    currentImageIndex = index;
    const img = allImages[index];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    lbImageNext.style.display = 'none'; // Hide the next image holder initially
    lbImage.style.opacity = 1;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    const imageUrl = `#image/${img.id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open', 'zoomed');
    document.body.style.overflow = 'auto';
    if (window.location.hash.startsWith('#image/')) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }
  
  function applyTransform(element, x, y, s) {
    element.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }

  function resetZoom() {
    scale = 1; translateX = 0; translateY = 0; isZoomed = false;
    lightbox.classList.remove('zoomed');
    lbImage.style.transition = 'transform 0.3s ease-out';
    applyTransform(lbImage, 0, 0, 1);
    setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
  }

  function toggleZoom(e) {
    if (!isZoomed) {
      const rect = lbImage.getBoundingClientRect();
      const originX = (e.clientX || e.touches[0].clientX) - rect.left;
      const originY = (e.clientY || e.touches[0].clientY) - rect.top;
      
      lbImage.style.transformOrigin = `${originX}px ${originY}px`;
      
      scale = 2.5;
      translateX = -(originX / (rect.width / lbImage.offsetWidth)) * (scale - 1);
      translateY = -(originY / (rect.height / lbImage.offsetHeight)) * (scale - 1);

      isZoomed = true;
      lightbox.classList.add('zoomed');
      lbImage.style.transition = 'transform 0.3s ease-out';
      applyTransform(lbImage, translateX, translateY, scale);
      setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
    } else {
      resetZoom();
    }
  }

  function getDistance(touches) {
    const [touch1, touch2] = touches;
    return Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
  }

  function onTouchStart(e) {
    if (isTransitioning) return;
    lbImage.style.transition = 'none';
    lbImageNext.style.transition = 'none';

    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      if (isZoomed) {
        startX = clientX - translateX;
        startY = clientY - translateY;
      } else {
        isSwiping = true;
        swipeStartX = clientX;
        swipeCurrentX = clientX;
      }
      const now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); toggleZoom(e); }
      lastTap = now;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance = getDistance(e.touches);
      initialScale = scale;
      isSwiping = false;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (isTransitioning) return;

    if (e.touches.length === 1) {
      if (isZoomed) {
        const { clientX, clientY } = e.touches[0];
        translateX = clientX - startX;
        translateY = clientY - startY;
        applyTransform(lbImage, translateX, translateY, scale);
      } else if (isSwiping) {
        swipeCurrentX = e.touches[0].clientX;
        const diffX = swipeCurrentX - swipeStartX;

        if (swipeDirection === 0) { // First move determines direction
          swipeDirection = diffX < 0 ? 1 : -1;
          const nextIndex = (currentImageIndex + swipeDirection + allImages.length) % allImages.length;
          lbImageNext.src = allImages[nextIndex].src;
          lbImageNext.style.display = 'block';
        }
        
        applyTransform(lbImage, diffX, 0, 1);
        const nextImageX = (swipeDirection === 1 ? window.innerWidth : -window.innerWidth) + diffX;
        applyTransform(lbImageNext, nextImageX, 0, 1);
      }
    } else if (e.touches.length === 2) {
      const currentDistance = getDistance(e.touches);
      let newScale = (currentDistance / initialDistance) * initialScale;
      if (newScale < 1) newScale = 1; if (newScale > 5) newScale = 5;
      scale = newScale;
      isZoomed = (scale > 1.05);
      lightbox.classList.toggle('zoomed', isZoomed);
      applyTransform(lbImage, translateX, translateY, scale);
    }
  }

  function onTouchEnd(e) {
    if (isSwiping && !isZoomed) {
      isSwiping = false;
      const diffX = swipeCurrentX - swipeStartX;
      if (Math.abs(diffX) > swipeThreshold) {
        const newIndex = (currentImageIndex + swipeDirection + allImages.length) % allImages.length;
        slideTo(newIndex, swipeDirection);
      } else { // Cancel swipe
        lbImage.style.transition = 'transform 0.3s ease-out';
        lbImageNext.style.transition = 'transform 0.3s ease-out';
        applyTransform(lbImage, 0, 0, 1);
        const nextImageX = swipeDirection === 1 ? window.innerWidth : -window.innerWidth;
        applyTransform(lbImageNext, nextImageX, 0, 1);
      }
      swipeDirection = 0;
      return;
    }
    
    if (scale < 1.05 && isZoomed) { resetZoom(); return; }
    if (e.touches.length < 2) initialDistance = 0;
    if (e.touches.length === 0 && isZoomed) {
      const rect = lbImage.getBoundingClientRect();
      const containerRect = lightboxContent.getBoundingClientRect();
      let needsCorrection = false;
      if (rect.right < containerRect.right) { translateX += containerRect.right - rect.right; needsCorrection = true; }
      if (rect.left > containerRect.left) { translateX += containerRect.left - rect.left; needsCorrection = true; }
      if (rect.bottom < containerRect.bottom) { translateY += containerRect.bottom - rect.bottom; needsCorrection = true; }
      if (rect.top > containerRect.top) { translateY += containerRect.top - rect.top; needsCorrection = true; }
      if (needsCorrection) { lbImage.style.transition = 'transform 0.3s ease-out'; applyTransform(lbImage, translateX, translateY, scale); }
    }
  }
  
  function slideTo(newIndex, direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    // Prepare next image if not already done by swipe
    if (!lbImageNext.style.display || lbImageNext.style.display === 'none') {
      lbImageNext.src = allImages[newIndex].src;
      lbImageNext.style.display = 'block';
      const initialNextX = direction === 1 ? window.innerWidth : -window.innerWidth;
      applyTransform(lbImageNext, initialNextX, 0, 1);
    }

    lbImage.style.transition = 'transform 0.3s ease-out';
    lbImageNext.style.transition = 'transform 0.3s ease-out';

    const finalCurrentImageX = direction === 1 ? -window.innerWidth : window.innerWidth;
    applyTransform(lbImage, finalCurrentImageX, 0, 1);
    applyTransform(lbImageNext, 0, 0, 1);
    
    setTimeout(() => {
      // Commit the change
      currentImageIndex = newIndex;
      const newImgData = allImages[currentImageIndex];
      lbImage.src = newImgData.src;
      lbImage.alt = `Enlarged view of ${escapeHtml(newImgData.title || 'artwork')}`;
      history.replaceState({ lightbox: 'open' }, '', `#image/${newImgData.id}`);

      // Reset positions silently
      lbImage.style.transition = 'none';
      lbImageNext.style.transition = 'none';
      applyTransform(lbImage, 0, 0, 1);
      lbImageNext.style.display = 'none';

      isTransitioning = false;
    }, 300);
  }

  // =======================================================================
  // === نهاية آلية تكبير الصور الجديدة ===
  // =======================================================================

  // --- Event Listeners Setup ---
  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState(null, '', link.getAttribute('href'));
      showSection(link.getAttribute('href').substring(1));
      closeMenu();
    });
  });

  nameEl.innerHTML = nameEl.textContent.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  nameEl.addEventListener('click', () => {
    nameEl.querySelectorAll('span').forEach((span, i) => {
      setTimeout(() => span.classList.add('bounce'), i * 50);
      setTimeout(() => span.classList.remove('bounce'), 1000 + i * 50);
    });
  });

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxContent) closeLightbox(); });

  lbImage.addEventListener('click', (e) => {
    if (lightbox.classList.contains('avatar-open')) {
      e.stopPropagation();
      closeLightbox();
    }
  });

  prevArrow.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    slideTo(newIndex, -1);
  });
  nextArrow.addEventListener('click', (e) => { 
    e.stopPropagation();
    const newIndex = (currentImageIndex + 1) % allImages.length;
    slideTo(newIndex, 1);
  });

  lightboxContent.addEventListener('touchstart', onTouchStart, { passive: false });
  lightboxContent.addEventListener('touchmove', onTouchMove, { passive: false });
  lightboxContent.addEventListener('touchend', onTouchEnd, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('open') && !lightbox.classList.contains('avatar-open') && !isZoomed) {
      if (e.key === 'ArrowRight') {
        const newIndex = (currentImageIndex + 1) % allImages.length;
        slideTo(newIndex, 1);
      }
      if (e.key === 'ArrowLeft') {
        const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
        slideTo(newIndex, -1);
      }
    }
    if (lightbox.classList.contains('open') && e.key === 'Escape') {
      closeLightbox();
    }
  });
  
  // Omitted menu swipe logic for brevity as it's unchanged

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

  authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
      auth.signOut().catch(error => console.error("Sign out error", error));
    } else {
      auth.signInWithPopup(provider).catch(error => { console.error("Sign in error", error); });
    }
    closeMenu();
  });

  auth.onAuthStateChanged((user) => {
    const isAdmin = user && user.email === 'p7ilosop7y@gmail.com';
    authBtn.textContent = user ? 'تسجيل الخروج' : 'تسجيل الدخول';
    addImageBtn.style.display = isAdmin ? 'inline-block' : 'none';
  });

  addImageBtn.addEventListener('click', () => {
    const uploadWidget = cloudinary.createUploadWidget({
      cloudName: 'dswtpqdsh',
      uploadPreset: 'Mohamed',
      folder: 'portfolio',
      cropping: true,
    }, (error, result) => {
      if (!error && result && result.event === "success") {
        const imageUrl = result.info.secure_url;
        const title = prompt("Enter the image title:");
        const category = prompt("Enter category (illustration, concept, character):")?.toLowerCase();
        const validCategories = ["illustration", "concept", "character"];

        if (title && category && validCategories.includes(category)) {
          db.collection("portfolioimages").add({
            src: imageUrl,
            title: title,
            category: category,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: [],
            comments: []
          }).then(() => {
            alert("Image added successfully!");
            loadImages(document.querySelector('.filter-btn.active').dataset.category);
          }).catch(err => {
            console.error("Error adding image to Firestore:", err);
            alert("Failed to add image data. Check console and security rules.");
          });
        } else {
          alert("Invalid input. Please provide a title and a valid category.");
        }
      }
    });
    uploadWidget.open();
  });

  // --- Initial Load ---
  handleNavigation();
  loadImages();
  typeWriter();
});
