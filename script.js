// script.js

// --- DANGER ---
// THIS IS A SECURITY RISK. Do NOT expose your API key in client-side code in a real application.
// Use environment variables and a backend function (like a Cloud Function) to protect your credentials.
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
  const authBtn = document.getElementById('auth-btn');
  const addImageBtn = document.getElementById('addImageBtn');

  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;

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
    if (allImages.length === 0) { gallery.innerHTML = "<p>No images found in this category.</p>"; return; }
    allImages.forEach((imgObj, index) => gallery.appendChild(createImageCard(imgObj, index)));
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);
    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
      <div class="title-container" style="padding: 12px; text-align: right;"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
      <div class="card-actions" style="display: flex; align-items: center; justify-content: flex-end; padding: 0 12px 8px;">
        <span class="like-count" style="color: var(--muted); font-size: 14px; margin-right: 8px;">${imgObj.likes || 0}</span>
        <button class="like-btn" aria-label="Like this image" style="background: none; border: none; color: ${isLiked ? 'var(--accent)' : 'var(--muted)'}; cursor: pointer; font-size: 20px;">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
        </button>
        <a href="${imgObj.src}" download class="download-btn" aria-label="Download this image" style="background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; margin-left: 8px;"><i class="fas fa-download" aria-hidden="true"></i></a>
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
    const doc = await imageRef.get();
    if (!doc.exists) return;
    const { likedBy = [], likes = 0 } = doc.data();
    const icon = likeBtn.querySelector('i');
    let newLikes = likes;
    if (likedBy.includes(visitorId)) {
      newLikes--;
      const index = likedBy.indexOf(visitorId);
      likedBy.splice(index, 1);
      likeBtn.style.color = 'var(--muted)';
      icon.classList.replace('fas', 'far');
    } else {
      newLikes++;
      likedBy.push(visitorId);
      likeBtn.style.color = 'var(--accent)';
      icon.classList.replace('far', 'fas');
    }
    await imageRef.update({ likes: newLikes, likedBy });
    likeCountEl.textContent = newLikes;
  }

  async function addComment(imageId, inputEl, commentsListEl) {
    const commentText = inputEl.value.trim();
    if (!commentText) return;
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
      await imageRef.update({ comments: firebase.firestore.FieldValue.arrayUnion(commentText) });
      const newCommentDiv = document.createElement('div');
      newCommentDiv.className = 'comment';
      newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`;
      commentsListEl.appendChild(newCommentDiv);
      commentsListEl.scrollTop = commentsListEl.scrollHeight;
      inputEl.value = '';
    } catch (error) { console.error("Error adding comment:", error); alert("Failed to add comment."); }
  }

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    currentImageIndex = index;
    const img = allImages[index];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    const imageUrl = `#image/${img.id}`;
    if (window.location.hash !== imageUrl) { history.pushState({ lightbox: 'open' }, '', imageUrl); }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open');
    document.body.style.overflow = 'auto';
  }

  function navigateLightbox(direction) {
    if (allImages.length === 0) return;
    // direction: 1 for next, -1 for previous
    currentImageIndex = (currentImageIndex + direction + allImages.length) % allImages.length;
    const img = allImages[currentImageIndex];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    history.replaceState({ lightbox: 'open' }, '', `#image/${img.id}`);
  }

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

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) history.back(); });
  lbImage.addEventListener('click', (e) => {
    if (lightbox.classList.contains('avatar-open')) {
      e.stopPropagation();
      closeLightbox();
      if (window.location.hash) { history.pushState("", document.title, window.location.pathname + window.location.search); }
    }
  });

  // --- Keyboard & Swipe Navigation ---
  let touchstartX = 0;
  let touchendX = 0;
  const swipeThreshold = 50; // Minimum swipe distance in pixels

  function handleSwipeGesture() {
    if (lightbox.classList.contains('avatar-open')) return;
    const deltaX = touchendX - touchstartX;
    if (deltaX < -swipeThreshold) {
      navigateLightbox(1); // Swiped left, go to next
    } else if (deltaX > swipeThreshold) {
      navigateLightbox(-1); // Swiped right, go to previous
    }
  }

  lightbox.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('open') && !lightbox.classList.contains('avatar-open')) {
      if (e.key === 'ArrowRight') navigateLightbox(1); // Next image
      if (e.key === 'ArrowLeft') navigateLightbox(-1); // Previous image
      if (e.key === 'Escape') history.back();
    }
  });

  window.addEventListener('popstate', () => {
    if (!window.location.hash.startsWith('#image/')) closeLightbox();
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
      auth.signInWithPopup(provider).then(result => {
        if (result.user.email !== 'p7ilosop7y@gmail.com') {
          alert('This account is not authorized as an admin.');
          auth.signOut();
        }
      }).catch(error => { console.error("Sign in error", error); });
    }
    closeMenu();
  });

  auth.onAuthStateChanged((user) => {
    const isAdmin = user && user.email === 'p7ilosop7y@gmail.com';
    authBtn.textContent = isAdmin ? 'تسجيل الخروج' : 'تسجيل الدخول';
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
            loadImages(document.querySelector('.filter-btn.active').dataset.category); // Refresh gallery
          }).catch(err => {
            console.error("Error adding image to Firestore:", err);
            alert("Failed to add image data.");
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
